import { Dashboard } from "@/components/Dashboard";

interface HomeProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const authError = params.error
    ? decodeURIComponent(params.error)
    : undefined;

  return <Dashboard initialError={authError} />;
}
