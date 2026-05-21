import { HolderOutlined } from '@ant-design/icons'
import { DndContext, PointerSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Tag } from 'antd'

interface InterviewerRoleSorterProps {
  roles: string[]
  onChange: (roles: string[]) => void
}

export function InterviewerRoleSorter({ roles, onChange }: InterviewerRoleSorterProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const itemIds = roles.map((role, index) => `${index}:${role}`)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = itemIds.indexOf(String(active.id))
    const newIndex = itemIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    onChange(arrayMove(roles, oldIndex, newIndex))
  }

  if (roles.length === 0) {
    return (
      <div className="interview-role-sorter interview-role-sorter--empty">
        先选择至少一位面试官，再拖动调整轮次顺序。
      </div>
    )
  }

  return (
    <div className="interview-role-sorter">
      <div className="interview-role-sorter__hint">
        拖动右侧手柄即可调整顺序，排在最前面的面试官会优先开始。
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="interview-role-sorter__list">
            {roles.map((role, index) => (
              <SortableRoleRow key={itemIds[index]} id={itemIds[index]} index={index} role={role} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function SortableRoleRow({ id, index, role }: { id: string; index: number; role: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="interview-role-sorter__item">
      <div className="interview-role-sorter__copy">
        <Tag color="blue">{`第 ${index + 1} 轮`}</Tag>
        <strong>{role}</strong>
      </div>
      <button
        type="button"
        className="interview-role-sorter__handle"
        aria-label={`拖动调整 ${role} 的顺序`}
        {...attributes}
        {...listeners}
      >
        <HolderOutlined />
      </button>
    </div>
  )
}
