"use client";

import { useCallback, useEffect, useMemo, useState, type ElementType } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  Filter,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  UserX,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import {
  getDepartments,
  getDesignations,
  getRoles,
} from "@/services/master-data.service";
import {
  createEmployee,
  getAllEmployees,
  terminateEmployee,
  updateEmployee,
} from "@/services/employee.service";
import { Employee } from "@/types/employee.types";
import {
  DepartmentOption,
  DesignationOption,
  RoleOption,
} from "@/types/master-data.types";

type CreateEmployeeFormState = {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  roleId: string;
  departmentId: string;
  designationId: string;
  managerId: string;
  dateOfJoining: string;
};

type EditEmployeeFormState = {
  fullName: string;
  email: string;
  mobile: string;
  roleId: string;
  departmentId: string;
  designationId: string;
  managerId: string;
  dateOfJoining: string;
};

type ApiErrorResponse = {
  success?: boolean;
  message?: string | string[];
  error?: string;
};

type EmployeeStatusFilter = "ALL" | "ACTIVE" | "TERMINATED" | "ON_NOTICE";

const EMPLOYEES_PER_PAGE = 10;

const initialCreateForm: CreateEmployeeFormState = {
  fullName: "",
  email: "",
  mobile: "",
  password: "Employee@123",
  roleId: "",
  departmentId: "none",
  designationId: "none",
  managerId: "none",
  dateOfJoining: new Date().toISOString().split("T")[0],
};

const initialEditForm: EditEmployeeFormState = {
  fullName: "",
  email: "",
  mobile: "",
  roleId: "",
  departmentId: "none",
  designationId: "none",
  managerId: "none",
  dateOfJoining: "",
};

/**
 * Converts backend/API errors into clean readable messages.
 */
function getApiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  if (!error.response) {
    return "Backend server is not reachable. Please check if API server is running.";
  }

  const statusCode = error.response.status;
  const data = error.response.data;

  if (statusCode === 401) {
    return "Your session has expired. Please login again.";
  }

  if (statusCode === 403) {
    return "You do not have permission to perform this action.";
  }

  if (statusCode === 404) {
    return "Employee API route not found. Please check backend routes.";
  }

  if (statusCode >= 500) {
    return "Server error while processing employee request. Please try again later.";
  }

  if (Array.isArray(data?.message)) {
    return data.message[0] || fallback;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof data?.error === "string") {
    return data.error;
  }

  return fallback;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";

  return new Date(value).toISOString().split("T")[0];
}

function getStatusBadgeClass(status: string) {
  if (status === "ACTIVE") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  }

  if (status === "TERMINATED") {
    return "border-red-300/20 bg-red-300/10 text-red-200";
  }

  if (status === "ON_NOTICE") {
    return "border-orange-300/20 bg-orange-300/10 text-orange-200";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

function getOnlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function EmployeeSummaryCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "danger" | "info";
}) {
  const toneClass = {
    default: "bg-amber-300/10 text-amber-300",
    success: "bg-emerald-300/10 text-emerald-300",
    danger: "bg-red-300/10 text-red-300",
    info: "bg-blue-300/10 text-blue-200",
  };

  return (
    <Card className="group overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-xl shadow-black/20">
      <CardContent className="relative p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-300/5 blur-2xl transition group-hover:bg-amber-300/10" />

        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-sm font-semibold text-white/55">{label}</p>
        <p className="mt-1 text-3xl font-black text-white">{value}</p>
        <p className="mt-2 text-xs leading-5 text-white/45">{description}</p>
      </CardContent>
    </Card>
  );
}

function EmployeesLoading() {
  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <Skeleton className="h-48 rounded-[2rem] bg-white/10" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-3xl bg-white/10" />
        ))}
      </div>

      <Skeleton className="h-96 rounded-[2rem] bg-white/10" />
    </section>
  );
}

function EmptyEmployeesState({
  clearFilters,
}: {
  clearFilters: () => void;
}) {
  return (
    <div className="p-10">
      <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
          <UsersRound className="h-6 w-6" />
        </div>

        <h3 className="text-xl font-black text-white">No employees found</h3>
        <p className="mt-2 text-sm leading-6 text-white/50">
          No employee matched your current search or filter. Clear filters and
          try again.
        </p>

        <Button
          type="button"
          onClick={clearFilters}
          variant="outline"
          className="mt-5 rounded-xl border-amber-200/30 bg-white/5 text-white hover:bg-white/10"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  );
}

function DetailPill({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/40">
        <Icon className="h-3.5 w-3.5 text-amber-300" />
        {label}
      </div>

      <p className="break-words text-sm font-bold text-white">{value || "—"}</p>
    </div>
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<EmployeeStatusFilter>("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] =
    useState<EditEmployeeFormState>(initialEditForm);

  const [terminateTarget, setTerminateTarget] = useState<Employee | null>(null);
  const [isTerminateOpen, setIsTerminateOpen] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");
  const [isTerminating, setIsTerminating] = useState(false);

  const [createForm, setCreateForm] =
    useState<CreateEmployeeFormState>(initialCreateForm);

  const fetchEmployees = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }

      const data = await getAllEmployees();

      setEmployees(data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to fetch employees."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMasterData = useCallback(async () => {
    try {
      const [rolesData, departmentsData, designationsData] = await Promise.all([
        getRoles(),
        getDepartments(),
        getDesignations(),
      ]);

      setRoles(rolesData);
      setDepartments(departmentsData);
      setDesignations(designationsData);
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, "Failed to load employee form dropdowns.")
      );
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchEmployees(false), fetchMasterData()]);
    };

    void loadInitialData();
  }, [fetchEmployees, fetchMasterData]);

  const employeeSummary = useMemo(() => {
    return {
      total: employees.length,
      active: employees.filter((employee) => employee.status === "ACTIVE")
        .length,
      managers: employees.filter((employee) => employee.role?.name === "MANAGER")
        .length,
      terminated: employees.filter(
        (employee) => employee.status === "TERMINATED"
      ).length,
    };
  }, [employees]);

  const managerOptions = useMemo(() => {
    return employees.filter(
      (employee) =>
        employee.status === "ACTIVE" && employee.role?.name === "MANAGER"
    );
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const keyword = searchTerm.toLowerCase().trim();

    return employees.filter((employee) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : employee.status === statusFilter;

      const matchesRole =
        roleFilter === "ALL" ? true : employee.role?.id === roleFilter;

      const matchesDepartment =
        departmentFilter === "ALL"
          ? true
          : employee.department?.id === departmentFilter;

      const searchableText = [
        employee.employeeCode,
        employee.fullName,
        employee.email,
        employee.mobile,
        employee.status,
        employee.role?.name,
        employee.department?.name,
        employee.designation?.name,
        employee.manager?.fullName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = keyword ? searchableText.includes(keyword) : true;

      return matchesSearch && matchesStatus && matchesRole && matchesDepartment;
    });
  }, [employees, searchTerm, statusFilter, roleFilter, departmentFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / EMPLOYEES_PER_PAGE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * EMPLOYEES_PER_PAGE;
  const endIndex = startIndex + EMPLOYEES_PER_PAGE;

  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setRoleFilter("ALL");
    setDepartmentFilter("ALL");
    setCurrentPage(1);
  };

  const updateCreateForm = (
    field: keyof CreateEmployeeFormState,
    value: string
  ) => {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateEditForm = (
    field: keyof EditEmployeeFormState,
    value: string
  ) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateCommonEmployeeFields = ({
    fullName,
    email,
    mobile,
    roleId,
  }: {
    fullName: string;
    email: string;
    mobile: string;
    roleId: string;
  }) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileRegex = /^[6-9]\d{9}$/;

    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return false;
    }

    if (!email.trim()) {
      toast.error("Email is required.");
      return false;
    }

    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return false;
    }

    if (!mobile.trim()) {
      toast.error("Mobile number is required.");
      return false;
    }

    if (!mobileRegex.test(mobile.trim())) {
      toast.error("Please enter a valid 10 digit Indian mobile number.");
      return false;
    }

    if (!roleId) {
      toast.error("Role is required.");
      return false;
    }

    return true;
  };

  const validateCreateForm = () => {
    if (
      !validateCommonEmployeeFields({
        fullName: createForm.fullName,
        email: createForm.email,
        mobile: createForm.mobile,
        roleId: createForm.roleId,
      })
    ) {
      return false;
    }

    if (!createForm.password.trim()) {
      toast.error("Password is required.");
      return false;
    }

    if (createForm.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return false;
    }

    return true;
  };

  const handleCreateEmployee = async () => {
    if (!validateCreateForm()) return;

    try {
      setIsCreating(true);

      await createEmployee({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        mobile: createForm.mobile.trim(),
        password: createForm.password,
        roleId: createForm.roleId,
        departmentId:
          createForm.departmentId === "none" ? null : createForm.departmentId,
        designationId:
          createForm.designationId === "none"
            ? null
            : createForm.designationId,
        managerId: createForm.managerId === "none" ? null : createForm.managerId,
        dateOfJoining: createForm.dateOfJoining || null,
      });

      toast.success("Employee created successfully.");

      setCreateForm(initialCreateForm);
      setIsCreateOpen(false);
      setCurrentPage(1);

      await fetchEmployees(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to create employee."));
    } finally {
      setIsCreating(false);
    }
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);

    setEditForm({
      fullName: employee.fullName || "",
      email: employee.email || "",
      mobile: employee.mobile || "",
      roleId: employee.role?.id || "",
      departmentId: employee.department?.id || "none",
      designationId: employee.designation?.id || "none",
      managerId: employee.manager?.id || "none",
      dateOfJoining: toDateInputValue(employee.dateOfJoining),
    });

    setIsEditOpen(true);
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    if (
      !validateCommonEmployeeFields({
        fullName: editForm.fullName,
        email: editForm.email,
        mobile: editForm.mobile,
        roleId: editForm.roleId,
      })
    ) {
      return;
    }

    try {
      setIsUpdating(true);

      await updateEmployee(selectedEmployee.id, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        mobile: editForm.mobile.trim(),
        roleId: editForm.roleId,
        departmentId:
          editForm.departmentId === "none" ? null : editForm.departmentId,
        designationId:
          editForm.designationId === "none" ? null : editForm.designationId,
        managerId: editForm.managerId === "none" ? null : editForm.managerId,
        dateOfJoining: editForm.dateOfJoining || null,
      });

      toast.success("Employee updated successfully.");

      setIsEditOpen(false);
      setSelectedEmployee(null);
      setEditForm(initialEditForm);

      await fetchEmployees(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to update employee."));
    } finally {
      setIsUpdating(false);
    }
  };

  const openTerminateModal = (employee: Employee) => {
    setTerminateTarget(employee);
    setTerminationReason("");
    setIsTerminateOpen(true);
  };

  const handleTerminateEmployee = async () => {
    if (!terminateTarget) return;

    if (!terminationReason.trim()) {
      toast.error("Termination reason is required.");
      return;
    }

    try {
      setIsTerminating(true);

      await terminateEmployee(terminateTarget.id, {
        terminationReason: terminationReason.trim(),
      });

      toast.success("Employee terminated successfully.");

      setIsTerminateOpen(false);
      setTerminateTarget(null);
      setTerminationReason("");

      await fetchEmployees(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to terminate employee."));
    } finally {
      setIsTerminating(false);
    }
  };

  if (isLoading) {
    return <EmployeesLoading />;
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      {/* Premium hero */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-[2rem] border border-amber-200/30 bg-[#17100b]/75 p-6 shadow-2xl shadow-black/30 sm:p-8 lg:p-10"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-200">
              <Sparkles className="h-4 w-4" />
              Employee Management
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Manage Company Employees
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              Create, update and manage employees, departments, roles, joining
              dates and current employment status for your solar power company
              workforce.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => fetchEmployees(true)}
              variant="outline"
              className="h-11 rounded-xl border-amber-200/30 bg-white/5 px-5 font-bold text-white hover:bg-white/10"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 rounded-xl bg-amber-400 px-5 font-black text-black hover:bg-amber-300">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Employee
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-100/15 bg-[#17100b] text-white sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">
                    Create New Employee
                  </DialogTitle>
                  <p className="text-sm text-white/50">
                    Add employee login details, role, department and joining
                    information.
                  </p>
                </DialogHeader>

                <div className="grid gap-4 pt-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={createForm.fullName}
                      onChange={(event) =>
                        updateCreateForm("fullName", event.target.value)
                      }
                      placeholder="Amit Kumar"
                      className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={createForm.email}
                      onChange={(event) =>
                        updateCreateForm("email", event.target.value)
                      }
                      placeholder="amit@company.com"
                      className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mobile</Label>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={createForm.mobile}
                      onChange={(event) =>
                        updateCreateForm(
                          "mobile",
                          getOnlyDigits(event.target.value)
                        )
                      }
                      placeholder="9876543210"
                      maxLength={10}
                      className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      value={createForm.password}
                      onChange={(event) =>
                        updateCreateForm("password", event.target.value)
                      }
                      placeholder="Employee@123"
                      className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={createForm.roleId}
                      onValueChange={(value) =>
                        updateCreateForm("roleId", value)
                      }
                    >
                      <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>

                      <SelectContent className="border-white/10 bg-[#17100b] text-white">
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select
                      value={createForm.departmentId}
                      onValueChange={(value) =>
                        updateCreateForm("departmentId", value)
                      }
                    >
                      <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>

                      <SelectContent className="border-white/10 bg-[#17100b] text-white">
                        <SelectItem value="none">No department</SelectItem>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Select
                      value={createForm.designationId}
                      onValueChange={(value) =>
                        updateCreateForm("designationId", value)
                      }
                    >
                      <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>

                      <SelectContent className="border-white/10 bg-[#17100b] text-white">
                        <SelectItem value="none">No designation</SelectItem>
                        {designations.map((designation) => (
                          <SelectItem
                            key={designation.id}
                            value={designation.id}
                          >
                            {designation.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Manager</Label>
                    <Select
                      value={createForm.managerId}
                      onValueChange={(value) =>
                        updateCreateForm("managerId", value)
                      }
                    >
                      <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>

                      <SelectContent className="border-white/10 bg-[#17100b] text-white">
                        <SelectItem value="none">No manager</SelectItem>
                        {managerOptions.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.fullName} - {manager.employeeCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Date of Joining</Label>
                    <Input
                      type="date"
                      value={createForm.dateOfJoining}
                      onChange={(event) =>
                        updateCreateForm("dateOfJoining", event.target.value)
                      }
                      className="border-white/10 bg-white/[0.04] text-white"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    onClick={handleCreateEmployee}
                    disabled={isCreating}
                    className="rounded-xl bg-amber-400 font-bold text-black hover:bg-amber-300"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Employee
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EmployeeSummaryCard
          label="Total Employees"
          value={employeeSummary.total}
          description="All employees available in HRMS."
          icon={UsersRound}
        />

        <EmployeeSummaryCard
          label="Active Employees"
          value={employeeSummary.active}
          description="Currently active workforce."
          icon={UserCheck}
          tone="success"
        />

        <EmployeeSummaryCard
          label="Managers"
          value={employeeSummary.managers}
          description="Active manager role users."
          icon={ShieldCheck}
          tone="info"
        />

        <EmployeeSummaryCard
          label="Terminated"
          value={employeeSummary.terminated}
          description="Employees marked terminated."
          icon={UserX}
          tone="danger"
        />
      </div>

      {/* Employee list */}
      <Card className="overflow-hidden border border-amber-100/10 bg-[#17100b]/75 text-white shadow-2xl shadow-black/25">
        <CardContent className="p-0">
          {/* Filters */}
          <div className="space-y-4 border-b border-white/10 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                  <Filter className="h-3.5 w-3.5" />
                  Employee Directory
                </div>

                <h2 className="text-xl font-black text-white">
                  Employee List
                </h2>
                <p className="mt-1 text-sm text-white/50">
                  Showing {filteredEmployees.length === 0 ? 0 : startIndex + 1}
                  -{Math.min(endIndex, filteredEmployees.length)} of{" "}
                  {filteredEmployees.length} employees
                </p>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-5xl xl:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search employee, email, mobile..."
                    className="h-11 border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/35"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as EmployeeStatusFilter);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-11 border-white/10 bg-white/[0.04] text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>

                  <SelectContent className="border-white/10 bg-[#17100b] text-white">
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="TERMINATED">Terminated</SelectItem>
                    <SelectItem value="ON_NOTICE">On Notice</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={roleFilter}
                  onValueChange={(value) => {
                    setRoleFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-11 border-white/10 bg-white/[0.04] text-white">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>

                  <SelectContent className="border-white/10 bg-[#17100b] text-white">
                    <SelectItem value="ALL">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={departmentFilter}
                  onValueChange={(value) => {
                    setDepartmentFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-11 border-white/10 bg-white/[0.04] text-white">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>

                  <SelectContent className="border-white/10 bg-[#17100b] text-white">
                    <SelectItem value="ALL">All Departments</SelectItem>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className="h-11 rounded-xl border-white/10 bg-white/5 px-5 text-white hover:bg-white/10"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop header */}
          <div className="hidden border-b border-white/10 px-5 py-4 xl:grid xl:grid-cols-[1.2fr_1.6fr_1.3fr_0.8fr_1fr_0.8fr_1.1fr] xl:gap-4">
            <p className="text-sm font-bold text-white/50">Employee</p>
            <p className="text-sm font-bold text-white/50">Contact</p>
            <p className="text-sm font-bold text-white/50">Department</p>
            <p className="text-sm font-bold text-white/50">Role</p>
            <p className="text-sm font-bold text-white/50">Joining Date</p>
            <p className="text-sm font-bold text-white/50">Status</p>
            <p className="text-right text-sm font-bold text-white/50">
              Actions
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {filteredEmployees.length === 0 ? (
              <EmptyEmployeesState clearFilters={clearFilters} />
            ) : (
              paginatedEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="grid gap-4 p-5 hover:bg-white/[0.025] xl:grid-cols-[1.2fr_1.6fr_1.3fr_0.8fr_1fr_0.8fr_1.1fr] xl:items-center xl:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/40 xl:hidden">Employee</p>
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-xs font-black text-black">
                        {(employee.fullName || "EM")
                          .split(" ")
                          .map((word) => word[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="break-words font-black text-white">
                          {employee.fullName}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {employee.employeeCode}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 space-y-2 text-sm text-white/65">
                    <p className="text-sm text-white/40 xl:hidden">Contact</p>
                    <p className="flex min-w-0 items-center gap-2 break-all">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                      {employee.email}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                      {employee.mobile}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-white/40 xl:hidden">
                      Department
                    </p>
                    <p className="flex min-w-0 items-center gap-2 font-semibold text-white">
                      <BriefcaseBusiness className="h-4 w-4 shrink-0 text-amber-300" />
                      <span className="break-words">
                        {employee.department?.name || "Not Assigned"}
                      </span>
                    </p>
                    <p className="mt-1 break-words text-xs text-white/45">
                      {employee.designation?.name || "No designation"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-sm text-white/40 xl:hidden">Role</p>
                    <Badge className="border-amber-300/20 bg-amber-300/10 text-amber-100">
                      {employee.role?.name || "—"}
                    </Badge>
                  </div>

                  <div>
                    <p className="mb-1 text-sm text-white/40 xl:hidden">
                      Joining Date
                    </p>
                    <p className="flex items-center gap-2 text-sm text-white/70">
                      <CalendarDays className="h-4 w-4 shrink-0 text-amber-300" />
                      {formatDate(employee.dateOfJoining)}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-sm text-white/40 xl:hidden">
                      Status
                    </p>
                    <Badge className={getStatusBadgeClass(employee.status)}>
                      {employee.status.replaceAll("_", " ")}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(employee)}
                      className="rounded-xl border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20"
                    >
                      <Edit className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={employee.status === "TERMINATED"}
                      onClick={() => openTerminateModal(employee)}
                      className="rounded-xl border-red-300/20 bg-red-300/10 text-red-100 hover:bg-red-300/20 disabled:opacity-40"
                    >
                      <UserX className="mr-1 h-3.5 w-3.5" />
                      Terminate
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-4 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/50">
              Page {safeCurrentPage} of {totalPages} • {EMPLOYEES_PER_PAGE}{" "}
              employees per page
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="h-9 w-9 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                className="h-9 w-9 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex min-w-24 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-bold text-amber-100">
                {safeCurrentPage} / {totalPages}
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={safeCurrentPage === totalPages}
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))
                }
                className="h-9 w-9 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="h-9 w-9 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit employee modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-100/15 bg-[#17100b] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Edit Employee
            </DialogTitle>
            <p className="text-sm text-white/50">
              Update employee profile and assignment details.
            </p>
          </DialogHeader>

          {selectedEmployee ? (
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-2">
              <DetailPill
                icon={UserRound}
                label="Employee"
                value={selectedEmployee.fullName}
              />
              <DetailPill
                icon={BadgeCheck}
                label="Employee Code"
                value={selectedEmployee.employeeCode}
              />
            </div>
          ) : null}

          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editForm.fullName}
                onChange={(event) =>
                  updateEditForm("fullName", event.target.value)
                }
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(event) =>
                  updateEditForm("email", event.target.value)
                }
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
              />
            </div>

            <div className="space-y-2">
              <Label>Mobile</Label>
              <Input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={editForm.mobile}
                onChange={(event) =>
                  updateEditForm("mobile", getOnlyDigits(event.target.value))
                }
                maxLength={10}
                className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editForm.roleId}
                onValueChange={(value) => updateEditForm("roleId", value)}
              >
                <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-[#17100b] text-white">
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={editForm.departmentId}
                onValueChange={(value) => updateEditForm("departmentId", value)}
              >
                <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-[#17100b] text-white">
                  <SelectItem value="none">No department</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Designation</Label>
              <Select
                value={editForm.designationId}
                onValueChange={(value) =>
                  updateEditForm("designationId", value)
                }
              >
                <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-[#17100b] text-white">
                  <SelectItem value="none">No designation</SelectItem>
                  {designations.map((designation) => (
                    <SelectItem key={designation.id} value={designation.id}>
                      {designation.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Manager</Label>
              <Select
                value={editForm.managerId}
                onValueChange={(value) => updateEditForm("managerId", value)}
              >
                <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>

                <SelectContent className="border-white/10 bg-[#17100b] text-white">
                  <SelectItem value="none">No manager</SelectItem>
                  {managerOptions
                    .filter((manager) => manager.id !== selectedEmployee?.id)
                    .map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.fullName} - {manager.employeeCode}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date of Joining</Label>
              <Input
                type="date"
                value={editForm.dateOfJoining}
                onChange={(event) =>
                  updateEditForm("dateOfJoining", event.target.value)
                }
                className="border-white/10 bg-white/[0.04] text-white"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleUpdateEmployee}
              disabled={isUpdating}
              className="rounded-xl bg-amber-400 font-bold text-black hover:bg-amber-300"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terminate employee modal */}
      <Dialog open={isTerminateOpen} onOpenChange={setIsTerminateOpen}>
        <DialogContent className="border-red-300/20 bg-[#17100b] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-red-100">
              Terminate Employee
            </DialogTitle>
            <p className="text-sm text-white/50">
              This action will mark employee as terminated.
            </p>
          </DialogHeader>

          <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4">
            <p className="font-bold text-white">
              {terminateTarget?.fullName || "Selected employee"}
            </p>
            <p className="mt-1 text-sm text-white/50">
              {terminateTarget?.employeeCode}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Termination Reason</Label>
            <Textarea
              value={terminationReason}
              onChange={(event) => setTerminationReason(event.target.value)}
              placeholder="Enter reason for termination..."
              className="min-h-28 border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
            />
          </div>

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTerminateOpen(false)}
              className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleTerminateEmployee}
              disabled={isTerminating}
              className="rounded-xl bg-red-500 font-bold text-white hover:bg-red-400"
            >
              {isTerminating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Terminating...
                </>
              ) : (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Terminate
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}