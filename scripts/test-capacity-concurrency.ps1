
$ErrorActionPreference = "Stop"

# =============================================================================
# EIRMIS: Capacity concurrency tests
#
# Runs independent PostgreSQL connections against the local Supabase database.
#
# Scenarios:
#   1. Public RSVP vs public RSVP.
#   2. Attendee approval vs attendee approval.
#   3. Public RSVP vs attendee approval.
#   4. Public RSVP vs waitlist promotion.
#   5. Attendee approval vs waitlist promotion.
#
# Requires:
#   - Docker Desktop running.
#   - Local Supabase stack running.
#   - Migrations 20261111000002 through 20261111000005 applied.
#
# Uses the seeded active organizer:
#   11111111-1111-1111-1111-111111111111
#
# No Resend API key or .env file is required.
# =============================================================================


# -----------------------------------------------------------------------------
# 1. FIND THE LOCAL SUPABASE DATABASE CONTAINER
# -----------------------------------------------------------------------------

$containers = @(
    docker ps --filter "name=supabase_db" --format "{{.Names}}" |
        Where-Object { $_ }
)

if ($containers.Count -eq 0) {
    throw "No running Supabase database container found. Start Supabase with: npx supabase start"
}

if ($containers.Count -gt 1) {
    Write-Host "Multiple Supabase database containers were found:"
    $containers | ForEach-Object { Write-Host "  $_" }
    throw "Stop the unrelated local Supabase projects or adapt the script to select the EIRMIS container."
}

$dbContainer = $containers[0]

Write-Host ""
Write-Host "Using database container: $dbContainer" -ForegroundColor Cyan


# -----------------------------------------------------------------------------
# 2. DATABASE HELPERS
# -----------------------------------------------------------------------------

function Invoke-DbSql {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Sql
    )

    $output = @(
        $Sql | docker exec -i $script:DbContainer `
            psql -X -q -A -t -v ON_ERROR_STOP=1 `
            -U postgres -d postgres 2>&1
    )

    $exitCode = $LASTEXITCODE
    $outputText = $output -join "`n"

    if ($exitCode -ne 0) {
        throw "Local SQL execution failed:`n$outputText"
    }

    return $outputText.Trim()
}


function Start-DbSqlJob {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Sql
    )

    return Start-Job -ArgumentList $script:DbContainer, $Sql -ScriptBlock {
        param(
            [string]$ContainerName,
            [string]$Statement
        )

        $output = @(
            $Statement | docker exec -i $ContainerName `
                psql -X -q -A -t -v ON_ERROR_STOP=1 `
                -U postgres -d postgres 2>&1
        )

        $exitCode = $LASTEXITCODE
        $outputText = $output -join "`n"

        [PSCustomObject]@{
            ExitCode = $exitCode
            Output   = $outputText.Trim()
        }
    }
}


function Get-DbJobResults {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Jobs
    )

    Wait-Job -Job $Jobs | Out-Null

    $results = foreach ($job in $Jobs) {
        Receive-Job -Job $job
    }

    Remove-Job -Job $Jobs

    return @($results)
}


function Assert-Equal {
    param(
        [string]$Name,
        [string]$Actual,
        [string]$Expected
    )

    if ($Actual.Trim() -ne $Expected) {
        throw "$Name FAILED. Expected '$Expected', received '$Actual'."
    }

    Write-Host "[PASS] $Name" -ForegroundColor Green
}


function Assert-OneCapacityRejection {
    param(
        [string]$Name,
        [object[]]$Results
    )

    $successes = @($Results | Where-Object { $_.ExitCode -eq 0 })
    $failures = @($Results | Where-Object { $_.ExitCode -ne 0 })

    if ($successes.Count -ne 1 -or $failures.Count -ne 1) {
        throw "$Name FAILED. Expected one successful operation and one capacity rejection. Successes: $($successes.Count); failures: $($failures.Count)."
    }

    if ($failures[0].Output -notmatch "EVENT_CAPACITY_EXCEEDED") {
        throw "$Name FAILED. The rejected operation did not report EVENT_CAPACITY_EXCEEDED:`n$($failures[0].Output)"
    }

    Write-Host "[PASS] $Name" -ForegroundColor Green
}


function Assert-OneOrOther {
    param(
        [string]$Name,
        [string]$Actual,
        [string[]]$Allowed
    )

    if ($Actual -notin $Allowed) {
        throw "$Name FAILED. Received '$Actual'. Allowed states: $($Allowed -join ' OR ')"
    }

    Write-Host "[PASS] $Name ($Actual)" -ForegroundColor Green
}


# Make the database container available to helper functions and jobs.
$script:DbContainer = $dbContainer

$allTestsPassed = $false


try {

    # =========================================================================
    # 3. CLEAN UP FIXTURES FROM AN EARLIER SUCCESSFUL OR INTERRUPTED RUN
    # =========================================================================

    $cleanupSql = @"
DELETE FROM public.events
WHERE id IN (
    'f1000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000002',
    'f1000000-0000-4000-8000-000000000003',
    'f1000000-0000-4000-8000-000000000004',
    'f1000000-0000-4000-8000-000000000005'
);

DELETE FROM public.guests
WHERE email LIKE 'pgtap-concurrency-%@example.test';
"@

    Invoke-DbSql -Sql $cleanupSql | Out-Null


    # =========================================================================
    # 4. CREATE FIXTURE EVENTS, GUESTS, INVITATIONS AND ATTENDEES
    # =========================================================================

    $setupSql = @"
SET client_min_messages = warning;

-- Five events. Each has exactly one place available after its initial setup.

INSERT INTO public.events (
    id, organizer_id, title, slug,
    starts_at, ends_at, capacity,
    rsvp_deadline, visibility_mode, status
)
VALUES
(
    'f1000000-0000-4000-8000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Concurrency Admission vs Admission',
    'pgtap-concurrency-admission',
    now() + interval '2 days',
    now() + interval '3 days',
    1,
    now() + interval '1 day',
    'open_registration',
    'published'
),
(
    'f1000000-0000-4000-8000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'Concurrency Approval vs Approval',
    'pgtap-concurrency-approval',
    now() + interval '2 days',
    now() + interval '3 days',
    2,
    now() + interval '1 day',
    'open_registration',
    'published'
),
(
    'f1000000-0000-4000-8000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'Concurrency Admission vs Approval',
    'pgtap-concurrency-admission-approval',
    now() + interval '2 days',
    now() + interval '3 days',
    2,
    now() + interval '1 day',
    'open_registration',
    'published'
),
(
    'f1000000-0000-4000-8000-000000000004',
    '11111111-1111-1111-1111-111111111111',
    'Concurrency Admission vs Promotion',
    'pgtap-concurrency-admission-promotion',
    now() + interval '2 days',
    now() + interval '3 days',
    2,
    now() + interval '1 day',
    'open_registration',
    'published'
),
(
    'f1000000-0000-4000-8000-000000000005',
    '11111111-1111-1111-1111-111111111111',
    'Concurrency Approval vs Promotion',
    'pgtap-concurrency-approval-promotion',
    now() + interval '2 days',
    now() + interval '3 days',
    2,
    now() + interval '1 day',
    'open_registration',
    'published'
);


-- Guest directory rows.

INSERT INTO public.guests (
    id, email, full_name
)
VALUES
(
    'f2000000-0000-4000-8000-000000000001',
    'pgtap-concurrency-base-b@example.test',
    'Concurrency Base B'
),
(
    'f2000000-0000-4000-8000-000000000002',
    'pgtap-concurrency-base-c@example.test',
    'Concurrency Base C'
),
(
    'f2000000-0000-4000-8000-000000000003',
    'pgtap-concurrency-base-d@example.test',
    'Concurrency Base D'
),
(
    'f2000000-0000-4000-8000-000000000004',
    'pgtap-concurrency-wait-d@example.test',
    'Concurrency Waitlist D'
),
(
    'f2000000-0000-4000-8000-000000000005',
    'pgtap-concurrency-base-e@example.test',
    'Concurrency Base E'
),
(
    'f2000000-0000-4000-8000-000000000006',
    'pgtap-concurrency-wait-e@example.test',
    'Concurrency Waitlist E'
);


-- Accepted base invitations create one approved primary attendee each.

INSERT INTO public.invitations (
    id, event_id, guest_id, status, max_party_size
)
VALUES
(
    'f3000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000002',
    'f2000000-0000-4000-8000-000000000001',
    'accepted',
    3
),
(
    'f3000000-0000-4000-8000-000000000002',
    'f1000000-0000-4000-8000-000000000003',
    'f2000000-0000-4000-8000-000000000002',
    'accepted',
    2
),
(
    'f3000000-0000-4000-8000-000000000003',
    'f1000000-0000-4000-8000-000000000004',
    'f2000000-0000-4000-8000-000000000003',
    'accepted',
    2
),
(
    'f3000000-0000-4000-8000-000000000004',
    'f1000000-0000-4000-8000-000000000005',
    'f2000000-0000-4000-8000-000000000005',
    'accepted',
    2
);


-- Waitlisted invitations used by promotion races.

INSERT INTO public.invitations (
    id, event_id, guest_id, status, max_party_size, waitlisted_at
)
VALUES
(
    'f3000000-0000-4000-8000-000000000005',
    'f1000000-0000-4000-8000-000000000004',
    'f2000000-0000-4000-8000-000000000004',
    'waitlisted',
    1,
    now() - interval '2 minutes'
),
(
    'f3000000-0000-4000-8000-000000000006',
    'f1000000-0000-4000-8000-000000000005',
    'f2000000-0000-4000-8000-000000000006',
    'waitlisted',
    1,
    now() - interval '2 minutes'
);


-- Pending attendee rows.
-- Event B has two pending attendees competing for one seat.
-- Event C has one pending attendee competing with a public RSVP.
-- Event E has one pending attendee competing with waitlist promotion.

INSERT INTO public.attendees (
    id, invitation_id, full_name, status
)
VALUES
(
    'f4000000-0000-4000-8000-000000000001',
    'f3000000-0000-4000-8000-000000000001',
    'Concurrent Approval One',
    'pending'
),
(
    'f4000000-0000-4000-8000-000000000002',
    'f3000000-0000-4000-8000-000000000001',
    'Concurrent Approval Two',
    'pending'
),
(
    'f4000000-0000-4000-8000-000000000003',
    'f3000000-0000-4000-8000-000000000002',
    'Concurrent Admission Approval',
    'pending'
),
(
    'f4000000-0000-4000-8000-000000000004',
    'f3000000-0000-4000-8000-000000000004',
    'Concurrent Promotion Approval',
    'pending'
);

"@

    Invoke-DbSql -Sql $setupSql | Out-Null

    Write-Host "[PASS] Concurrency fixtures created." -ForegroundColor Green


    # =========================================================================
    # SCENARIO 1: PUBLIC RSVP VS PUBLIC RSVP
    #
    # Event capacity = 1
    # Initial headcount = 0
    #
    # Expected:
    #   - One accepted invitation.
    #   - One waitlisted invitation.
    #   - Total approved headcount = 1.
    # =========================================================================

    Write-Host ""
    Write-Host "Scenario 1: Public RSVP vs public RSVP" -ForegroundColor Cyan

    $sqlA1 = @"
SELECT pg_sleep(1);
SELECT (public.admit_public_rsvp(
    'pgtap-concurrency-admission',
    'pgtap-concurrency-one@example.test',
    'Concurrent Guest One'
)).status::text;
"@

    $sqlA2 = @"
SELECT pg_sleep(1);
SELECT (public.admit_public_rsvp(
    'pgtap-concurrency-admission',
    'pgtap-concurrency-two@example.test',
    'Concurrent Guest Two'
)).status::text;
"@

    $jobA1 = Start-DbSqlJob -Sql $sqlA1
    $jobA2 = Start-DbSqlJob -Sql $sqlA2

    $resultsA = Get-DbJobResults -Jobs @($jobA1, $jobA2)

    if (@($resultsA | Where-Object { $_.ExitCode -eq 0 }).Count -ne 2) {
        throw "Scenario 1 failed: one or both RSVP operations returned an SQL error."
    }

    $stateA = Invoke-DbSql -Sql @"
SELECT
    COUNT(*) FILTER (WHERE status = 'accepted')::text || '|' ||
    COUNT(*) FILTER (WHERE status = 'waitlisted')::text || '|' ||
    COALESCE(SUM(party_size), 0)::text
FROM public.invitations
WHERE event_id = 'f1000000-0000-4000-8000-000000000001';
"@

    Assert-Equal `
        -Name "Concurrent public RSVPs admit only one guest" `
        -Actual $stateA `
        -Expected "1|1|1"


    # =========================================================================
    # SCENARIO 2: ATTENDEE APPROVAL VS ATTENDEE APPROVAL
    #
    # Event capacity = 2
    # Initial headcount = 1
    # Two pending attendees compete for one seat.
    #
    # Expected:
    #   - Exactly one approval succeeds.
    #   - The other receives EVENT_CAPACITY_EXCEEDED.
    #   - Final approved headcount = 2.
    # =========================================================================

    Write-Host ""
    Write-Host "Scenario 2: Attendee approval vs attendee approval" -ForegroundColor Cyan

    $sqlB1 = @"
SELECT pg_sleep(1);
SELECT public.decide_attendee(
    'f4000000-0000-4000-8000-000000000001',
    'approve',
    '11111111-1111-1111-1111-111111111111',
    false,
    NULL
)->>'capacity_warning';
"@

    $sqlB2 = @"
SELECT pg_sleep(1);
SELECT public.decide_attendee(
    'f4000000-0000-4000-8000-000000000002',
    'approve',
    '11111111-1111-1111-1111-111111111111',
    false,
    NULL
)->>'capacity_warning';
"@

    $jobB1 = Start-DbSqlJob -Sql $sqlB1
    $jobB2 = Start-DbSqlJob -Sql $sqlB2

    $resultsB = Get-DbJobResults -Jobs @($jobB1, $jobB2)

    Assert-OneCapacityRejection `
        -Name "Concurrent attendee approvals serialize capacity decisions" `
        -Results $resultsB

    $stateB = Invoke-DbSql -Sql @"
SELECT
    (
        SELECT COUNT(*)::text
        FROM public.attendees
        WHERE id IN (
            'f4000000-0000-4000-8000-000000000001',
            'f4000000-0000-4000-8000-000000000002'
        )
          AND status = 'approved'
    ) || '|' ||
    (
        SELECT COUNT(*)::text
        FROM public.attendees
        WHERE id IN (
            'f4000000-0000-4000-8000-000000000001',
            'f4000000-0000-4000-8000-000000000002'
        )
          AND status = 'pending'
    ) || '|' ||
    (
        SELECT COALESCE(SUM(party_size), 0)::text
        FROM public.invitations
        WHERE event_id = 'f1000000-0000-4000-8000-000000000002'
    );
"@

    Assert-Equal `
        -Name "Concurrent approvals leave exactly one new attendee approved" `
        -Actual $stateB `
        -Expected "1|1|2"


    # =========================================================================
    # SCENARIO 3: PUBLIC RSVP VS ATTENDEE APPROVAL
    #
    # Event capacity = 2
    # Initial headcount = 1
    #
    # Expected:
    #   Option A: approval succeeds; new RSVP is waitlisted.
    #   Option B: new RSVP is accepted; attendee approval is rejected.
    #
    # Both options must leave headcount = 2.
    # =========================================================================

    Write-Host ""
    Write-Host "Scenario 3: Public RSVP vs attendee approval" -ForegroundColor Cyan

    $sqlC1 = @"
SELECT pg_sleep(1);
SELECT (public.admit_public_rsvp(
    'pgtap-concurrency-admission-approval',
    'pgtap-concurrency-cross@example.test',
    'Concurrent Cross Guest'
)).status::text;
"@

    $sqlC2 = @"
SELECT pg_sleep(1);
SELECT public.decide_attendee(
    'f4000000-0000-4000-8000-000000000003',
    'approve',
    '11111111-1111-1111-1111-111111111111',
    false,
    NULL
)->>'capacity_warning';
"@

    $jobC1 = Start-DbSqlJob -Sql $sqlC1
    $jobC2 = Start-DbSqlJob -Sql $sqlC2

    $resultsC = Get-DbJobResults -Jobs @($jobC1, $jobC2)

    if (
        @($resultsC | Where-Object { $_.ExitCode -eq 0 }).Count -lt 1 -or
        @($resultsC | Where-Object { $_.ExitCode -ne 0 }).Count -gt 1
    ) {
        throw "Scenario 3 failed: unexpected concurrent operation results."
    }

    $stateC = Invoke-DbSql -Sql @"
SELECT
    COALESCE(SUM(i.party_size), 0)::text || '|' ||
    (
        SELECT a.status::text
        FROM public.attendees a
        WHERE a.id = 'f4000000-0000-4000-8000-000000000003'
    ) || '|' ||
    (
        SELECT i2.status::text
        FROM public.invitations i2
        JOIN public.guests g ON g.id = i2.guest_id
        WHERE i2.event_id = 'f1000000-0000-4000-8000-000000000003'
          AND g.email = 'pgtap-concurrency-cross@example.test'
    )
FROM public.invitations i
WHERE i.event_id = 'f1000000-0000-4000-8000-000000000003';
"@

    Assert-OneOrOther `
        -Name "Admission and approval never exceed shared event capacity" `
        -Actual $stateC `
        -Allowed @(
            "2|approved|waitlisted",
            "2|pending|accepted"
        )


    # =========================================================================
    # SCENARIO 4: PUBLIC RSVP VS WAITLIST PROMOTION
    #
    # Event capacity = 2
    # Initial headcount = 1
    # One waitlisted invitation competes with a new public RSVP.
    #
    # Expected:
    #   Option A: promotion succeeds; new RSVP is waitlisted.
    #   Option B: new RSVP is accepted; promotion returns zero rows.
    #
    # Final headcount must equal 2.
    # =========================================================================

    Write-Host ""
    Write-Host "Scenario 4: Public RSVP vs waitlist promotion" -ForegroundColor Cyan

    $sqlD1 = @"
SELECT pg_sleep(1);
SELECT COUNT(*)::integer
FROM public.promote_waitlist_fifo(
    'f1000000-0000-4000-8000-000000000004',
    1
);
"@

    $sqlD2 = @"
SELECT pg_sleep(1);
SELECT (public.admit_public_rsvp(
    'pgtap-concurrency-admission-promotion',
    'pgtap-concurrency-promotion@example.test',
    'Concurrent Promotion Guest'
)).status::text;
"@

    $jobD1 = Start-DbSqlJob -Sql $sqlD1
    $jobD2 = Start-DbSqlJob -Sql $sqlD2

    $resultsD = Get-DbJobResults -Jobs @($jobD1, $jobD2)

    if (@($resultsD | Where-Object { $_.ExitCode -eq 0 }).Count -ne 2) {
        throw "Scenario 4 failed: one or both operations returned an SQL error."
    }

    $stateD = Invoke-DbSql -Sql @"
SELECT
    COALESCE(SUM(i.party_size), 0)::text || '|' ||
    (
        SELECT status::text
        FROM public.invitations
        WHERE id = 'f3000000-0000-4000-8000-000000000005'
    ) || '|' ||
    (
        SELECT i2.status::text
        FROM public.invitations i2
        JOIN public.guests g ON g.id = i2.guest_id
        WHERE i2.event_id = 'f1000000-0000-4000-8000-000000000004'
          AND g.email = 'pgtap-concurrency-promotion@example.test'
    )
FROM public.invitations i
WHERE i.event_id = 'f1000000-0000-4000-8000-000000000004';
"@

    Assert-OneOrOther `
        -Name "Public admission and promotion never exceed shared event capacity" `
        -Actual $stateD `
        -Allowed @(
            "2|accepted|waitlisted",
            "2|waitlisted|accepted"
        )


    # =========================================================================
    # SCENARIO 5: ATTENDEE APPROVAL VS WAITLIST PROMOTION
    #
    # Event capacity = 2
    # Initial headcount = 1
    #
    # Expected:
    #   Option A: attendee approval succeeds; waitlisted invitation stays queued.
    #   Option B: waitlist promotion succeeds; attendee approval is rejected.
    #
    # Both options must leave headcount = 2.
    # =========================================================================

    Write-Host ""
    Write-Host "Scenario 5: Attendee approval vs waitlist promotion" -ForegroundColor Cyan

    $sqlE1 = @"
SELECT pg_sleep(1);
SELECT public.decide_attendee(
    'f4000000-0000-4000-8000-000000000004',
    'approve',
    '11111111-1111-1111-1111-111111111111',
    false,
    NULL
)->>'capacity_warning';
"@

    $sqlE2 = @"
SELECT pg_sleep(1);
SELECT COUNT(*)::integer
FROM public.promote_waitlist_fifo(
    'f1000000-0000-4000-8000-000000000005',
    1
);
"@

    $jobE1 = Start-DbSqlJob -Sql $sqlE1
    $jobE2 = Start-DbSqlJob -Sql $sqlE2

    $resultsE = Get-DbJobResults -Jobs @($jobE1, $jobE2)

    if (
        @($resultsE | Where-Object { $_.ExitCode -eq 0 }).Count -lt 1 -or
        @($resultsE | Where-Object { $_.ExitCode -ne 0 }).Count -gt 1
    ) {
        throw "Scenario 5 failed: unexpected concurrent operation results."
    }

    $stateE = Invoke-DbSql -Sql @"
SELECT
    COALESCE(SUM(i.party_size), 0)::text || '|' ||
    (
        SELECT status::text
        FROM public.attendees
        WHERE id = 'f4000000-0000-4000-8000-000000000004'
    ) || '|' ||
    (
        SELECT status::text
        FROM public.invitations
        WHERE id = 'f3000000-0000-4000-8000-000000000006'
    )
FROM public.invitations i
WHERE i.event_id = 'f1000000-0000-4000-8000-000000000005';
"@

    Assert-OneOrOther `
        -Name "Attendee approval and promotion never exceed shared event capacity" `
        -Actual $stateE `
        -Allowed @(
            "2|approved|waitlisted",
            "2|pending|accepted"
        )


    # =========================================================================
    # 5. ALL SCENARIOS PASSED
    # =========================================================================

    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "ALL FIVE CONCURRENCY SCENARIOS PASSED" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green

    $allTestsPassed = $true

}
finally {

    # -------------------------------------------------------------------------
    # 6. CLEAN UP FIXTURE DATA ONLY AFTER A SUCCESSFUL RUN
    #
    # If a scenario fails, fixtures are kept for inspection.
    # Run the script again to reset them before retrying.
    # -------------------------------------------------------------------------

    if ($allTestsPassed) {

        $finalCleanupSql = @"
DELETE FROM public.events
WHERE id IN (
    'f1000000-0000-4000-8000-000000000001',
    'f1000000-0000-4000-8000-000000000002',
    'f1000000-0000-4000-8000-000000000003',
    'f1000000-0000-4000-8000-000000000004',
    'f1000000-0000-4000-8000-000000000005'
);

DELETE FROM public.guests
WHERE email LIKE 'pgtap-concurrency-%@example.test';
"@

        try {
            Invoke-DbSql -Sql $finalCleanupSql | Out-Null
            Write-Host "[CLEANUP] Temporary concurrency fixtures removed." -ForegroundColor Cyan
        }
        catch {
            Write-Warning "Concurrency tests passed, but fixture cleanup failed: $_"
        }
    }
    else {
        Write-Warning "Concurrency fixtures were retained for debugging."
    }

}
