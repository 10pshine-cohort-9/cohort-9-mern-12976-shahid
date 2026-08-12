export default function Loader({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
      <div className="w-8 h-8 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
