import type { Metadata } from 'next';
import AdminPanelClient from '@/components/AdminPanelClient';

export const metadata: Metadata = {
  title: 'Admin Panel – Aitoolhindi.online',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminPanelPage() {
  return <AdminPanelClient />;
}
