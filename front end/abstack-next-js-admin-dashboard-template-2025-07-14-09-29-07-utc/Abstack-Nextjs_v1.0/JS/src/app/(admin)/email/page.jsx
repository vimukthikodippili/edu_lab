import PageTitle from '@/components/PageTitle';
import { Card } from 'react-bootstrap';
import EmailArea from './components/EmailArea';
import { EmailProvider } from '@/context/useEmailContext';
export const metadata = {
  title: 'Inbox'
};
const EmailPage = () => {
  return <>
      <PageTitle title="Inbox" />
      <Card>
        <EmailProvider>
          <div className="d-flex">
            <EmailArea />
          </div>
        </EmailProvider>
      </Card>
    </>;
};
export default EmailPage;