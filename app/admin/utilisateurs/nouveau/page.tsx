import type { Metadata } from 'next';
import { EntityForm } from '@/components/entity-form';
import { userFields } from '@/components/admin-fields';
import { PageHeader } from '@/components/ui';
import { saveUser } from '@/actions/admin';

export const metadata: Metadata = { title: 'Créer un compte' };

export default function NewUserPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Créer un compte"
        subtitle="Le compte est utilisable immédiatement avec le mot de passe défini ici."
      />
      <div className="card p-6">
        <EntityForm
          action={saveUser}
          fields={userFields(true)}
          defaults={{ role: 'user', status: 'active' }}
          submitLabel="Créer le compte"
          cancelHref="/admin/utilisateurs"
        />
      </div>
    </div>
  );
}
