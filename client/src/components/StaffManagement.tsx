import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trpcVanilla } from "@/lib/trpcVanilla";

interface Staff {
  id: string;
  name: string;
  role: string | null;
  status: string | null;
  canLogin: boolean | null;
  createdAt: Date;
}

interface StaffManagementProps {
  cafeteriaId: string;
}

export function StaffManagement({ cafeteriaId }: StaffManagementProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>("");
  const [editingCanLogin, setEditingCanLogin] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load staff
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const staffData = await trpcVanilla.staff.getStaff.query({
          cafeteriaId,
        });
        setStaff(staffData);
      } catch (error: any) {
        toast.error(error.message || "Failed to load staff");
      } finally {
        setLoading(false);
      }
    };

    loadStaff();
  }, [cafeteriaId]);

  const startEditing = (staffMember: Staff) => {
    setEditingStaffId(staffMember.id);
    setEditingRole(staffMember.role || "waiter");
    setEditingCanLogin(staffMember.canLogin ?? false);
  };

  const cancelEditing = () => {
    setEditingStaffId(null);
    setEditingRole("");
    setEditingCanLogin(false);
  };

  const saveChanges = async () => {
    if (!editingStaffId) return;

    setSaving(true);
    try {
      // Update role if changed
      const currentStaff = staff.find((s) => s.id === editingStaffId);
      if (currentStaff && currentStaff.role !== editingRole) {
        await trpcVanilla.staff.updateStaffRole.mutate({
          staffId: editingStaffId,
          newRole: editingRole as "admin" | "manager" | "waiter" | "chef",
        });
      }

      // Toggle login if changed
      if (currentStaff && currentStaff.canLogin !== editingCanLogin) {
        await trpcVanilla.staff.toggleStaffLogin.mutate({
          staffId: editingStaffId,
          enable: editingCanLogin,
        });
      }

      // Update local state
      setStaff(
        staff.map((s) =>
          s.id === editingStaffId
            ? { ...s, role: editingRole, canLogin: editingCanLogin }
            : s
        )
      );

      toast.success("Staff updated successfully");
      cancelEditing();
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Staff Management</h3>
        <Badge variant="outline">{staff.length} members</Badge>
      </div>

      {staff.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No staff members found for this cafeteria.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                    {member.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={member.status === "active" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {member.status || "unknown"}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {member.role || "no role"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {editingStaffId === member.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editingRole}
                        onChange={(e) => setEditingRole(e.target.value)}
                        className="text-sm border border-gray-200 rounded-md px-2 py-1"
                      >
                        <option value="waiter">Waiter</option>
                        <option value="chef">Chef</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Login</span>
                        <Switch
                          checked={editingCanLogin}
                          onCheckedChange={setEditingCanLogin}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={saveChanges}
                        disabled={saving}
                        className="text-xs"
                      >
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditing}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditing(member)}
                      className="text-xs"
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
