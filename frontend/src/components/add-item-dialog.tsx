import { useState, type ReactNode, cloneElement, isValidElement } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  TextField, MenuItem, Button, Stack,
} from "@mui/material";
import { toast } from "sonner";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea";
  options?: string[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
};

interface AddItemDialogProps {
  trigger: ReactNode;
  title: string;
  description?: string;
  submitLabel?: string;
  fields: Field[];
  onSubmit: (values: Record<string, string>) => void;
  successMessage?: string;
}

export function AddItemDialog({
  trigger, title, description, submitLabel = "บันทึก", fields, onSubmit,
  successMessage = "บันทึกสำเร็จ",
}: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? ""])),
  );

  function reset() {
    setValues(Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? ""])));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (const f of fields) {
      if (f.required !== false && !values[f.name]?.trim()) {
        toast.error(`กรุณากรอก ${f.label}`);
        return;
      }
    }
    onSubmit(values);
    toast.success(successMessage);
    reset();
    setOpen(false);
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
                  type={f.type === "number" ? "number" : "text"}
                  select={f.type === "select"}
                  multiline={f.type === "textarea"}
                  minRows={f.type === "textarea" ? 3 : undefined}
                  value={values[f.name]}
                  onChange={(e) => setValues((s) => ({ ...s, [f.name]: e.target.value }))}
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
            <Button type="submit" variant="contained">{submitLabel}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
