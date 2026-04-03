import { auth } from '@/lib/auth';
import WordPressDataView from '@/components/wordpress-data-view';

export default async function WordPressPage() {
  await auth();
  return <WordPressDataView />;
}
