'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface DragItem {
  id: string;
  type: string;
  data: any;
}

interface DragDropContextValue {
  draggedItem: DragItem | null;
  isDragging: boolean;
  dragStartPosition: { x: number; y: number } | null;
  setDraggedItem: (item: DragItem | null) => void;
  setDragStartPosition: (position: { x: number; y: number } | null) => void;
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

interface DragDropProviderProps {
  children: ReactNode;
}

export function DragDropProvider({ children }: DragDropProviderProps) {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null);

  const isDragging = draggedItem !== null;

  const value = {
    draggedItem,
    isDragging,
    dragStartPosition,
    setDraggedItem,
    setDragStartPosition
  };

  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  );
}

export function useDragDrop() {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
}

// ドラッグ可能な要素のhook
export function useDraggable(id: string, type: string, data: any) {
  const { setDraggedItem, setDragStartPosition } = useDragDrop();

  const handleDragStart = useCallback((e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStartPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    setDraggedItem({ id, type, data });
    
    // データ転送の設定
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, [id, type, data, setDraggedItem, setDragStartPosition]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragStartPosition(null);
  }, [setDraggedItem, setDragStartPosition]);

  return {
    draggable: true,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd
  };
}

// ドロップ可能な要素のhook
export function useDroppable(
  accept: string[],
  onDrop: (draggedItem: DragItem, dropPosition: 'before' | 'after' | 'inside') => void
) {
  const { draggedItem, isDragging } = useDragDrop();
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  const canDrop = isDragging && draggedItem && accept.includes(draggedItem.type);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!canDrop) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // ドロップ位置の判定
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    if (y < height / 3) {
      setDropPosition('before');
    } else if (y > height * 2 / 3) {
      setDropPosition('after');
    } else {
      setDropPosition('inside');
    }
  }, [canDrop]);

  const handleDragLeave = useCallback(() => {
    setDropPosition(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!canDrop || !draggedItem || !dropPosition) return;
    
    e.preventDefault();
    onDrop(draggedItem, dropPosition);
    setDropPosition(null);
  }, [canDrop, draggedItem, dropPosition, onDrop]);

  return {
    canDrop,
    dropPosition,
    isOver: dropPosition !== null,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop
  };
} 