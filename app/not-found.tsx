// Static 404: the config read below runs at build, not per request. Bots
// generate high 404 volume, so rendering this dynamically was a major Fluid
// Active CPU cost. The 404 text refreshes on redeploy (it changes very rarely).
import NotFoundClient from './not-found-client';
import connectToDatabase from '@/lib/db';

export default async function NotFound() {
  let config = {
    notFoundTitle: '404',
    notFoundHeading: '>_ RESOURCE_NOT_FOUND _<',
    notFoundSubtext:
      "The entity you're tracking has vanished.\nThe matrix has been altered, or the path is corrupted.",
    notFoundButton: 'RETURN TO BASE',
  };

  try {
    const db = await connectToDatabase();
    const doc = await db.connection.client
      .db('portfolio_cms')
      .collection('homepage')
      .findOne({ type: 'system_content' });

    if (doc) {
      if (doc.notFoundTitle) config.notFoundTitle = doc.notFoundTitle;
      if (doc.notFoundHeading) config.notFoundHeading = doc.notFoundHeading;
      if (doc.notFoundSubtext) config.notFoundSubtext = doc.notFoundSubtext;
      if (doc.notFoundButton) config.notFoundButton = doc.notFoundButton;
    }
  } catch (error) {
    // If DB fails, we still render the client with fallback config
  }

  return <NotFoundClient config={config} />;
}
