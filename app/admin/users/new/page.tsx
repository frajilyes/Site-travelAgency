import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { userFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveUser } from '@/actions/admin';

export const metadata: Metadata = { title: 'Create an account' };

export default function NewUserPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create an account"
        subtitle="The account can be used straight away with the password set here."
      />
      <div className="card p-6">
        <EntityForm
          action={saveUser}
          fields={userFields(true)}
          defaults={{ role: 'user', status: 'active' }}
          submitLabel="Create account"
          cancelHref="/admin/users"
        />
      </div>
    </div>
  );
}
