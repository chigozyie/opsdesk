export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to BizDesk
        </h1>
        <p className="text-xl text-center text-muted-foreground mb-8">
          Your comprehensive business management platform
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Customer Management</h3>
            <p className="text-muted-foreground">
              Manage your customer relationships and track interactions
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Invoice Management</h3>
            <p className="text-muted-foreground">
              Create, send, and track invoices with automated calculations
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Expense Tracking</h3>
            <p className="text-muted-foreground">
              Log and categorize business expenses for better financial control
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Task Management</h3>
            <p className="text-muted-foreground">
              Coordinate work and track completion with your team
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Financial Reports</h3>
            <p className="text-muted-foreground">
              View key metrics and understand your business performance
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Multi-Tenant</h3>
            <p className="text-muted-foreground">
              Secure workspace isolation for multiple businesses
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
