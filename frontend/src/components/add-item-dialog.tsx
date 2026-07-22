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
  flex?: number;
  disabled?: boolean;
  condition?: (values: Record<string, string>) => boolean;
};

export type FieldOrRow =
  | Field
  | { type: "row"; fields: Field[]; condition?: (values: Record<string, string>) => boolean };

interface AddItemDialogProps {
  trigger: ReactNode;
  title: string;
  description?: string;
  submitLabel?: string;
  fields: FieldOrRow[];
  onSubmit: (values: Record<string, string>) => void;
  successMessage?: string;
  onFieldChange?: (name: string, value: string, values: Record<string, string>) => Record<string, string>;
}

function flattenFields(fields: FieldOrRow[]): Field[] {
  return fields.flatMap((f) => ("fields" in f ? f.fields : [f]));
}

export function AddItemDialog({
  trigger, title, description, submitLabel = "บันทึก", fields, onSubmit,
  successMessage = "บันทึกสำเร็จ", onFieldChange,
}: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const flat = flattenFields(fields);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(flat.map((f) => [f.name, f.defaultValue ?? ""])),
  );

  function reset() {
    setValues(Object.fromEntries(flat.map((f) => [f.name, f.defaultValue ?? ""])));
  }

  function setField(name: string, value: string) {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      return onFieldChange ? onFieldChange(name, value, next) : next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const visible = flat.filter((f) => !f.condition || f.condition(values));
    for (const f of visible) {
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

  function renderField(f: Field) {
    return (
      <TextField
        key={f.name}
        fullWidth
        label={f.label}
        placeholder={f.placeholder}
        type={f.type === "number" ? "number" : "text"}
        select={f.type === "select"}
        multiline={f.type === "textarea"}
        minRows={f.type === "textarea" ? 3 : undefined}
        disabled={f.disabled}
        value={values[f.name] ?? ""}
        onChange={(e) => setField(f.name, e.target.value)}
      >
        {f.type === "select" && f.options?.map((o) => (
          <MenuItem key={o} value={o}>{o}</MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <>
      {triggerEl}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {description && <DialogContentText sx={{ mb: 2 }}>{description}</DialogContentText>}
            <Stack spacing={2} sx={{ pt: 1 }}>
              {fields.map((f, i) => {
                if ("fields" in f) {
                  if (f.condition && !f.condition(values)) return null;
                  return (
                    <Stack key={i} direction="row" spacing={2}>
                      {f.fields.map((sub) => (
                        <div key={sub.name} style={{ flex: sub.flex ?? 1, minWidth: 0 }}>
                          {renderField(sub)}
                        </div>
                      ))}
                    </Stack>
                  );
                }
                if (f.condition && !f.condition(values)) return null;
                return renderField(f);
              })}
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