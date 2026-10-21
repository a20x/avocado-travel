'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Открыть окно
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Отменить бронь K7M2QX?">
        <p>Места освободятся, и их смогут купить другие.</p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Не отменять
          </Button>
          <Button onClick={() => setOpen(false)}>Отменить бронь</Button>
        </div>
      </Dialog>
    </>
  );
}
