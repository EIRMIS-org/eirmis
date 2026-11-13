
BEGIN;

-- Declare that this test file contains 3 assertions.
SELECT plan(3);

-- 1. Verify that the test connects to the local PostgreSQL database.
SELECT ok(
    current_database() = 'postgres',
    'Connected to the local PostgreSQL database'
);

-- 2. Verify that the EIRMIS events table exists.
SELECT has_table(
    'public',
    'events',
    'The events table exists'
);

-- 3. Verify that the EIRMIS invitations table exists.
SELECT has_table(
    'public',
    'invitations',
    'The invitations table exists'
);

-- Display the test results.
SELECT * FROM finish();

ROLLBACK;
