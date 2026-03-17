import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { useBranchStore } from "../../stores/branchStore";
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { Users, Plus, Trash2, Key, Spinner } from "../../components/icons";
import { Card, PageHeader, Button, Input, Modal, EmptyState, IconButton } from "../../components/ui";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import type { User } from "../../types";

export default function UserManagementPage() {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const t = useThemeClasses();
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedClerkId, setSelectedClerkId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneNumber: "",
  });

  const { data: clerks = [], isLoading } = useQuery({
    queryKey: ["clerks", selectedBranch?.id],
    queryFn: () => apiService.getClerksByBranchId(selectedBranch?.id || ""),
    enabled: !!selectedBranch?.id,
  });

  const createClerkMutation = useMutation({
    mutationFn: (
      data: Omit<
        User,
        | "id"
        | "createdAt"
        | "updatedAt"
        | "name"
        | "role"
        | "permissions"
        | "avatar"
        | "isActive"
        | "isTemporaryPassword"
      > & { password: string } & { branch_id: string } & {
        firstName: string;
      } & { lastName: string } & { email: string } & { phoneNumber: string },
    ) =>
      apiService.createClerk({
        ...data,
        branch_id: selectedBranch?.id || "",
        password: data.password,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (clerkId: string) => apiService.deleteUser(clerkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clerks"] });
      success("Clerk account deleted successfully", "User Deleted", 4000);
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete clerk account";
      showError(errorMessage, "Deletion Failed", 5000);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({
      clerkId,
      password,
    }: {
      clerkId: string;
      password: string;
    }) => apiService.changeClerkPassword(clerkId, password),
    onSuccess: () => {
      setShowPasswordModal(false);
      setSelectedClerkId(null);
      setNewPassword("");
      success("Password changed successfully", "Password Updated", 4000);
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to change password";
      showError(errorMessage, "Update Failed", 5000);
    },
  });

  if (user?.role !== "manager" || !selectedBranch) {
    return (
      <Card>
        <p className={t.textSecondary}>
          Access denied. Manager role and branch selection required.
        </p>
      </Card>
    );
  }

  const generatePassword = () => {
    const length = 12;
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData({ ...formData, password });
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setFormData({ firstName: "", lastName: "", email: "", password: "", phoneNumber: "" });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.email.trim() ||
      !formData.password.trim()
    ) {
      showError("Please fill in all required fields", "Validation Error", 4000);
      return;
    }
    createClerkMutation.mutate({
      ...formData,
      branch_id: selectedBranch?.id || "",
    });

    resetForm();
    success("Clerk created successfully", "User Created", 4000);
    queryClient.invalidateQueries({ queryKey: ["clerks"] });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClerkId || !newPassword.trim()) {
      alert("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    changePasswordMutation.mutate({
      clerkId: selectedClerkId,
      password: newPassword,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        actions={
          <Button icon={Plus} onClick={() => setShowCreateForm(true)}>
            invite
          </Button>
        }
      />

      {/* Create Clerk Form Modal */}
      <Modal open={showCreateForm} onClose={resetForm} title="Create New Clerk">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name *"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <Input
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <div>
            <label className={cn("block text-sm font-medium mb-1", t.textSecondary)}>
              Temporary Password *
            </label>
            <div className="flex gap-2">
              <Input
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Click Generate to create a temporary password"
                required
                className="flex-1"
              />
              <Button variant="secondary" type="button" onClick={generatePassword}>
                Generate
              </Button>
            </div>
          </div>

          <Input
            label="Phone Number"
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          />

          <div className="flex gap-3">
            <Button type="submit" loading={createClerkMutation.isPending} className="flex-1">
              {createClerkMutation.isPending ? "Creating..." : "Create Clerk"}
            </Button>
            <Button variant="secondary" type="button" onClick={resetForm} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        open={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setSelectedClerkId(null); setNewPassword(""); }}
        title="Change Password"
      >
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            label="New Password *"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />

          <div className="flex gap-3">
            <Button type="submit" loading={changePasswordMutation.isPending} className="flex-1">
              {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => { setShowPasswordModal(false); setSelectedClerkId(null); setNewPassword(""); }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : clerks.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No clerks found for this branch."
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <table className="w-full">
            <thead className={t.isDark ? "bg-gray-700" : "bg-gray-50"}>
              <tr>
                {["Name", "Email", "Phone", "Actions"].map((h) => (
                  <th key={h} className={cn("px-6 py-3 text-left text-xs font-medium uppercase", t.textSecondary)}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {clerks.map((clerk: User) => (
                <tr key={clerk.id}>
                  <td className={cn("px-6 py-4 whitespace-nowrap", t.text)}>
                    {clerk.name ||
                      `${clerk.firstName || ""} ${clerk.lastName || ""}`.trim() ||
                      "N/A"}
                  </td>
                  <td className={cn("px-6 py-4 whitespace-nowrap", t.textSecondary)}>
                    {clerk.email}
                  </td>
                  <td className={cn("px-6 py-4 whitespace-nowrap", t.textSecondary)}>
                    {clerk.phoneNumber || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <IconButton
                        icon={Key}
                        size={16}
                        label="Change Password"
                        onClick={() => {
                          setSelectedClerkId(clerk.id);
                          setNewPassword("");
                          setShowPasswordModal(true);
                        }}
                      />
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this user?")) {
                            deleteMutation.mutate(clerk.id);
                          }
                        }}
                        className={cn(
                          "p-2 rounded-md",
                          t.isDark ? "hover:bg-red-900/30 text-red-400" : "hover:bg-red-50 text-red-600",
                        )}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
