import { Toaster } from 'sonner';

export default function FeedbackToasts() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      expand={true}
      theme="light"
    />
  );
}