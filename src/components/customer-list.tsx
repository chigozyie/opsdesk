'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Mail, Phone, MapPin, MoreVertical } from 'lucide-react';
import { archiveCustomer } from '@/lib/server-actions/customer-actions';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Customer } from '@/lib/validation/schemas/customer';

interface CustomerListProps {
  customers: Customer[];
  workspaceSlug: string;
  userRole: 'admin' | 'member' | 'viewer';
  currentPage: number;
  totalCustomers: number;
  hasMore: boolean;
}

export function CustomerList({ 
  customers, 
  workspaceSlug, 
  userRole, 
  currentPage, 
  totalCustomers, 
  hasMore 
}: CustomerListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [archivingCustomers, setArchivingCustomers] = useState<Set<string>>(new Set());

  const canModify = userRole === 'admin' || userRole === 'member';

  const handleArchiveCustomer = async (customer: Customer) => {
    if (archivingCustomers.has(customer.id)) return;

    const confirmed = confirm(
      customer.archived 
        ? `Are you sure you want to restore ${customer.name}?`
        : `Are you sure you want to archive ${customer.name}? This will hide them from the main list but preserve all data.`
    );

    if (!confirmed) return;

    setArchivingCustomers(prev => new Set(prev).add(customer.id));

    try {
      const result = await archiveCustomer({
        id: customer.id,
        workspace_id: customer.workspace_id,
        archived: !customer.archived,
      });

      if (result.success) {
        toast({
          title: customer.archived ? 'Customer restored' : 'Customer archived',
          description: `${customer.name} has been ${customer.archived ? 'restored' : 'archived'} successfully.`,
          variant: 'success',
        });
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to update customer',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error archiving customer:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while updating the customer',
        variant: 'destructive',
      });
    } finally {
      setArchivingCustomers(prev => {
        const next = new Set(prev);
        next.delete(customer.id);
        return next;
      });
    }
  };

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium text-foreground">No customers found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by creating your first customer.
        </p>
        {canModify && (
          <div className="mt-6">
            <Button asChild>
              <Link href={`/app/${workspaceSlug}/customers/new` as any}>
                Add Customer
              </Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-4">
        {customers.map((customer) => (
          <div key={customer.id} className="bg-white border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Link
                  href={`/app/${workspaceSlug}/customers/${customer.id}` as any}
                  className="font-medium text-primary hover:underline"
                >
                  {customer.name}
                </Link>
                <div className="flex items-center mt-1">
                  <Badge variant={customer.archived ? 'secondary' : 'default'} className="text-xs">
                    {customer.archived ? 'Archived' : 'Active'}
                  </Badge>
                </div>
              </div>
              {canModify && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/app/${workspaceSlug}/customers/${customer.id}/edit` as any}>
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleArchiveCustomer(customer)}
                      disabled={archivingCustomers.has(customer.id)}
                      className={customer.archived ? 'text-green-600' : 'text-destructive'}
                    >
                      {archivingCustomers.has(customer.id)
                        ? 'Processing...'
                        : customer.archived
                        ? 'Restore'
                        : 'Archive'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <div className="space-y-2 text-sm">
              {customer.email && (
                <div className="flex items-center text-muted-foreground">
                  <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-primary hover:underline truncate"
                  >
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center text-muted-foreground">
                  <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                  <a
                    href={`tel:${customer.phone}`}
                    className="hover:text-foreground"
                  >
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-xs">{customer.address}</span>
                </div>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground">
              Created {new Date(customer.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
              {canModify && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div>
                    <Link
                      href={`/app/${workspaceSlug}/customers/${customer.id}` as any}
                      className="font-medium text-primary hover:underline"
                    >
                      {customer.name}
                    </Link>
                    {customer.address && (
                      <p className="text-sm text-muted-foreground truncate max-w-xs">
                        {customer.address}
                      </p>
                    )}
                    {/* Show contact info on smaller screens */}
                    <div className="md:hidden mt-1 text-sm space-y-1">
                      {customer.email && (
                        <div>
                          <a
                            href={`mailto:${customer.email}`}
                            className="text-primary hover:underline text-xs"
                          >
                            {customer.email}
                          </a>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="text-muted-foreground text-xs">
                          <a
                            href={`tel:${customer.phone}`}
                            className="hover:text-foreground"
                          >
                            {customer.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="text-sm">
                    {customer.email && (
                      <div>
                        <a
                          href={`mailto:${customer.email}`}
                          className="text-primary hover:underline"
                        >
                          {customer.email}
                        </a>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="text-muted-foreground">
                        <a
                          href={`tel:${customer.phone}`}
                          className="hover:text-foreground"
                        >
                          {customer.phone}
                        </a>
                      </div>
                    )}
                    {!customer.email && !customer.phone && (
                      <span className="text-muted-foreground">No contact info</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={customer.archived ? 'secondary' : 'default'}>
                    {customer.archived ? 'Archived' : 'Active'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {new Date(customer.created_at).toLocaleDateString()}
                </TableCell>
                {canModify && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/app/${workspaceSlug}/customers/${customer.id}/edit` as any}>
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchiveCustomer(customer)}
                        disabled={archivingCustomers.has(customer.id)}
                        className={customer.archived ? 'text-green-600 hover:text-green-700' : 'text-destructive hover:text-destructive/90'}
                      >
                        {archivingCustomers.has(customer.id)
                          ? 'Processing...'
                          : customer.archived
                          ? 'Restore'
                          : 'Archive'}
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalCustomers}
        itemsPerPage={20}
        baseUrl={`/app/${workspaceSlug}/customers`}
      />
    </div>
  );
}