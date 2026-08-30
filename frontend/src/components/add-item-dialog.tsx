import { useState, type ReactNode, cloneElement, isValidElement } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  TextField, MenuItem, Button, Stack,
} from "@mui/material";
import { toast } from "sonner";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea" | "date";
  options?: string[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  /** ข้อความช่วยอธิบายใต้ช่อง เช่น บอกว่าค่านี้กรอกอัตโนมัติให้แล้ว (ยังแก้ไขเองได้) */
  helperText?: string;
};

interface AddItemDialogProps {
  trigger: ReactNode;
  title: string;
  description?: string;
  submitLabel?: string;
  fields: Field[];
  /** ถ้า return false (หรือ resolve เป็น false) ถือว่าบันทึกไม่สำเร็จ (เช่น validation ไม่ผ่าน) — dialog จะไม่ปิดและไม่ขึ้น success toast ให้ */
  onSubmit: (values: Record<string, string>) => void | boolean | Promise<void | boolean>;
  successMessage?: string;
  /**
   * เรียกทุกครั้งที่มีการแก้ไขค่าในฟอร์ม (values คือค่าล่าสุดหลังรวมการแก้ไขนี้แล้ว, changedField คือชื่อ field ที่เพิ่งเปลี่ยน)
   * ใช้สำหรับ "กรอกอัตโนมัติ" ให้ field อื่นตามค่าที่เลือก เช่น เลือกวัตถุดิบแล้วเติมหน่วยให้เอง
   * คืนค่าเป็น object ของ field ที่ต้องการเติม/แก้ (เฉพาะที่เปลี่ยน) หรือไม่คืนอะไรถ้าไม่มีอะไรต้องเติม
   */
  onAutoFill?: (values: Record<string, string>, changedField: string) => Partial<Record<string, string>> | void;
}

export function AddItemDialog({
  trigger, title, description, submitLabel = "บันทึก", fields, onSubmit,
  successMessage = "บันทึกสำเร็จ", onAutoFill,
}: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? ""])),
  );

  function reset() {
    setValues(Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? ""])));
  }

  function handleFieldChange(name: string, value: string) {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      const patch = onAutoFill?.(next, name);
      if (!patch) return next;
      const merged = { ...next };
      for (const [k, v] of Object.entries(patch)) {
        if (v !== undefined) merged[k] = v;
      }
      return merged;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (const f of fields) {
      if (f.required !== false && !values[f.name]?.trim()) {
        toast.error(`กรุณากรอก ${f.label}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const result = await onSubmit(values);
      if (result === false) return; // validation ไม่ผ่าน (onSubmit แจ้ง error เองแล้ว) — เปิด dialog ค้างไว้ให้แก้
      toast.success(successMessage);
      reset();
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const triggerEl = isValidElement(trigger)
    ? cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, { onClick: () => setOpen(true) })
    : <span onClick={() => setOpen(true)}>{trigger}</span>;

  return (
    <>
      {triggerEl}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {description && <DialogContentText sx={{ mb: 2 }}>{description}</DialogContentText>}
            <Stack spacing={2} sx={{ pt: 1 }}>
              {fields.map((f) => (
                <TextField
                  key={f.name}
                  label={f.label}
                  placeholder={f.placeholder}
                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                  select={f.type === "select"}
                  multiline={f.type === "textarea"}
                  minRows={f.type === "textarea" ? 3 : undefined}
                  value={values[f.name]}
                  helperText={f.helperText}
                  slotProps={f.type === "date" ? { inputLabel: { shrink: true } } : undefined}
                  onChange={(e) => handleFieldChange(f.name, e.target.value)}
                >
                  {f.type === "select" && f.options?.map((o) => (
                    <MenuItem key={o} value={o}>{o}</MenuItem>
                  ))}
                </TextField>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button type="submit" variant="contained" disabled={submitting}>{submitLabel}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
