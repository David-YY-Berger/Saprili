// bisiyata dishmaya, leharbot ahava biyisral
import { useState } from 'react';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';

export function PrintHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal onClose={onClose} open={open} title="Save this print file">
      <p>In the browser print dialog, choose “Save as PDF”.</p>
      <p>
        This PDF uses RGB colour. Print-shop compatibility is unverified; use a trusted prepress
        workflow if your printer requires CMYK or PDF/X.
      </p>
      <ul>
        <li>Set Margins to None.</li>
        <li>Turn Background graphics on.</li>
        <li>Keep the displayed paper size; do not scale the pages.</li>
      </ul>
      <div className="modal__actions">
        <Button onClick={onClose} variant="secondary">
          Close
        </Button>
      </div>
    </Modal>
  );
}

export function PrintToolbar({
  busy,
  onPrint,
  onGuidesChange,
}: {
  busy: boolean;
  onPrint: () => void;
  onGuidesChange: (enabled: boolean) => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [guides, setGuides] = useState(false);
  const toggleGuides = () => {
    const enabled = !guides;
    setGuides(enabled);
    onGuidesChange(enabled);
  };
  return (
    <>
      <nav aria-label="Print controls" className="print-toolbar">
        <Button disabled={busy} onClick={onPrint}>
          Print / Save as PDF
        </Button>
        <Button onClick={toggleGuides} variant="secondary">
          {guides ? 'Hide guides' : 'Show guides'}
        </Button>
        <Button onClick={() => setHelpOpen(true)} variant="secondary">
          Print help
        </Button>
      </nav>
      <PrintHelpDialog onClose={() => setHelpOpen(false)} open={helpOpen} />
    </>
  );
}
