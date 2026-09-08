import React from "react";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export interface FieldProps extends Omit<TextFieldProps, "onChange"> {
  label?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errorText?: string;
}

export function Field({
  label,
  placeholder,
  value,
  onChange,
  errorText,
  type = "text",
  fullWidth = true,
  ...props
}: FieldProps) {
  return (
    <Box sx={{ width: fullWidth ? "100%" : "auto" }}>
      {label ? (
        <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 500, color: "text.secondary" }}>
          {label}
        </Typography>
      ) : null}
      <TextField
        fullWidth={fullWidth}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        error={Boolean(errorText)}
        helperText={errorText}
        size="small"
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            backgroundColor: "#ffffff",
          },
        }}
        {...props}
      />
    </Box>
  );
}

export interface TextareaFieldProps extends Omit<TextFieldProps, "onChange"> {
  label?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}

export function TextareaField({
  label,
  placeholder,
  value,
  onChange,
  rows = 3,
  fullWidth = true,
  ...props
}: TextareaFieldProps) {
  return (
    <Box sx={{ width: fullWidth ? "100%" : "auto" }}>
      {label ? (
        <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 500, color: "text.secondary" }}>
          {label}
        </Typography>
      ) : null}
      <TextField
        multiline
        rows={rows}
        fullWidth={fullWidth}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        size="small"
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            backgroundColor: "#ffffff",
          },
        }}
        {...props}
      />
    </Box>
  );
}

export interface SelectFieldProps {
  label?: string;
  value?: string | number;
  onChange?: (e: any) => void;
  children: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
}

export function SelectField({
  label,
  value,
  onChange,
  children,
  fullWidth = true,
  disabled = false,
}: SelectFieldProps) {
  return (
    <Box sx={{ width: fullWidth ? "100%" : "auto" }}>
      {label ? (
        <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 500, color: "text.secondary" }}>
          {label}
        </Typography>
      ) : null}
      <FormControl fullWidth={fullWidth} size="small" disabled={disabled}>
        <Select
          native
          value={value ?? ""}
          onChange={onChange}
          sx={{
            borderRadius: 2,
            backgroundColor: "#ffffff",
            fontSize: "0.875rem",
          }}
        >
          {children}
        </Select>
      </FormControl>
    </Box>
  );
}
