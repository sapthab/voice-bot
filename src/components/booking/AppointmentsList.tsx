"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Appointment {
  id: string
  title: string
  start_time: string
  end_time: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  status: string
  created_at: string
}

interface AppointmentsListProps {
  agentId: string
}

export function AppointmentsList({ agentId }: AppointmentsListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/agents/${agentId}/appointments?upcoming=true`)
      .then((r) => r.json())
      .then((data) => setAppointments(data.appointments || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agentId])

  const statusVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "success" as const
      case "cancelled":
        return "destructive" as const
      case "rescheduled":
        return "secondary" as const
      default:
        return "secondary" as const
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Appointments</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-40 bg-muted animate-pulse rounded" />
        ) : appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming appointments
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appt) => (
                <TableRow key={appt.id}>
                  <TableCell>
                    <div className="font-medium">
                      {new Date(appt.start_time).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(appt.start_time).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(appt.end_time).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {appt.customer_name || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {appt.customer_email || appt.customer_phone || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(appt.status)}>{appt.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
