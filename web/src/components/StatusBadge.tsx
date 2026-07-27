const STYLES: Record<string, string> = {
  pending: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  error: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
        STYLES[status] ?? STYLES.pending
      }`}
    >
      {status}
    </span>
  );
}
