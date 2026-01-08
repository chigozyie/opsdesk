export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
        <p className="text-gray-600 mb-6">
          Sorry, we couldn&apos;t complete your authentication. This could be due to an expired or invalid link.
        </p>
        <div className="space-y-4">
          <a
            href="/login"
            className="block w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
          >
            Try logging in again
          </a>
          <a
            href="/signup"
            className="block w-full rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Create a new account
          </a>
        </div>
      </div>
    </div>
  );
}