import { AlertCircle, History, Mail, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEventAuditLogEntries } from "@/features/organizer/hooks/use-event-audit-log-entries";
import { useListEmailLogs } from "@/features/organizer/hooks/use-list-email-logs";

function emailStatusVariant(status: string) {
  switch (status) {
    case "delivered":
    case "sent":
      return "success" as const;
    case "queued":
      return "warning" as const;
    case "bounced":
    case "failed":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export interface ActivityTabProps {
  eventId: string;
}

export function ActivityTab({ eventId }: ActivityTabProps) {
  const emailLogsQuery = useListEmailLogs(eventId);
  const auditLogsQuery = useEventAuditLogEntries(eventId);

  const emailLogs = emailLogsQuery.data ?? [];
  const auditLogs = auditLogsQuery.data ?? [];

  const renderEmailLogs = () => {
    if (emailLogsQuery.isPending) {
      return (
        <div className="space-y-2" aria-label="Loading email logs">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (emailLogsQuery.isError) {
      return (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Unable to load email delivery logs.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void emailLogsQuery.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      );
    }

    if (emailLogs.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <Mail className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            No emails sent for this event yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Transactional emails such as invitations, confirmations, and QR
            bundles will appear here.
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recipient</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sent</TableHead>
            <TableHead>Message ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emailLogs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-medium text-foreground">
                {log.recipient_email}
              </TableCell>
              <TableCell className="font-mono text-xs">{log.type}</TableCell>
              <TableCell>
                <Badge variant={emailStatusVariant(log.status)}>
                  {log.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {log.sent_at
                  ? new Date(log.sent_at).toLocaleString()
                  : "Pending"}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {log.provider_message_id ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderAuditLogs = () => {
    if (auditLogsQuery.isPending) {
      return (
        <div className="space-y-2" aria-label="Loading audit log entries">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (auditLogsQuery.isError) {
      return (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Unable to load audit log entries.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void auditLogsQuery.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      );
    }

    if (auditLogs.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <History className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            No audit log entries recorded yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Approvals, overrides, QR dispatches, and check-in actions are
            recorded here automatically.
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {auditLogs.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-mono text-xs font-medium text-foreground">
                {entry.action}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{entry.actor_type}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {entry.entity_type}{" "}
                <span className="font-mono text-xs">
                  ({entry.entity_id.slice(0, 8)})
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {entry.reason ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(entry.created_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email delivery logs</CardTitle>
          <CardDescription>
            Read-only delivery history of transactional emails for this event.
          </CardDescription>
        </CardHeader>
        <CardContent>{renderEmailLogs()}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
          <CardDescription>
            Append-only record of state-changing organizer and system actions.
          </CardDescription>
        </CardHeader>
        <CardContent>{renderAuditLogs()}</CardContent>
      </Card>
    </div>
  );
}
