import {useDroppable} from '@dnd-kit/react';

export function DroppableBucket({id, children}) {
  const {ref} = useDroppable({
    id,
  });

  return (
    <div ref={ref} style={{width: 300, height: 300}}>
      {children}
    </div>
  );
}