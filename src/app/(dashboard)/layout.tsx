import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { Header } from "@/components/dashboard/Header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch user profile and organization
  const [profileResult, membershipResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single(),
    supabase
      .from("organization_members")
      .select("organization_id, organizations(name)")
      .eq("user_id", user.id)
      .single(),
  ])

  const profile = profileResult.data as { full_name: string | null; email: string } | null
  const membership = membershipResult.data as {
    organization_id: string
    organizations: { name: string } | null
  } | null

  const orgName = membership?.organizations?.name || "My Workspace"
  const userEmail = profile?.email || user.email || ""

  return (
    <div className="min-h-screen bg-muted/40">
      <Sidebar orgName={orgName} userEmail={userEmail} />
      <div className="lg:pl-64">
        <Header
          user={{
            email: user.email || "",
            fullName: profile?.full_name || undefined,
          }}
        />
        <main className="p-6 lg:p-10">{children}</main>
      </div>
    </div>
  )
}
