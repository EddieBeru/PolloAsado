import {useDraggable} from '@dnd-kit/react';

export function DraggableBucketItem() {
  const {ref} = useDraggable({
    id: 'draggable',
  });

  return (
    <button ref={ref}>
      Draggable
    </button>
  );
}