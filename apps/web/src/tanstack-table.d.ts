import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<_TData, _TValue> {
    className?: string;
    headerClassName?: string;
  }
}
