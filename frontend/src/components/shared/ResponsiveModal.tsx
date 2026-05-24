import { Button, Drawer, Modal, Space, type ModalProps } from 'antd'
import type { ReactNode } from 'react'
import { useIsMobile } from '../../lib/hooks/useIsMobile'

export interface ResponsiveModalProps extends Omit<ModalProps, 'children'> {
  children?: ReactNode
  mobileFooter?: ReactNode
  mobileHeight?: string | number
}

export function ResponsiveModal({
  children,
  open,
  onCancel,
  onOk,
  okText,
  cancelText,
  confirmLoading,
  title,
  className,
  footer,
  mobileFooter,
  mobileHeight = '92vh',
  styles,
  destroyOnHidden,
  ...rest
}: ResponsiveModalProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    let drawerFooter: ReactNode
    if (mobileFooter !== undefined) {
      drawerFooter = mobileFooter
    } else if (footer === null) {
      drawerFooter = undefined
    } else if (onOk) {
      drawerFooter = (
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={(e) => onCancel?.(e as never)}>
            {cancelText ?? '取消'}
          </Button>
          <Button
            type="primary"
            loading={confirmLoading}
            onClick={(e) => onOk(e as never)}
          >
            {okText ?? '确定'}
          </Button>
        </Space>
      )
    } else {
      drawerFooter = undefined
    }

    const incomingStyles = (styles ?? {}) as Record<string, React.CSSProperties | undefined>
    const incomingBodyStyle = incomingStyles.body ?? {}
    const { height: _h, maxHeight: _mh, overflow: _ov, ...bodyStyleRest } = incomingBodyStyle
    void _h; void _mh; void _ov
    const drawerBodyStyle: React.CSSProperties = {
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      flex: 1,
      overflow: 'auto',
      ...bodyStyleRest,
    }

    return (
      <Drawer
        open={open}
        onClose={(e) => onCancel?.(e as never)}
        title={title}
        placement="bottom"
        height={mobileHeight}
        destroyOnHidden={destroyOnHidden}
        className={['responsive-modal-drawer', className].filter(Boolean).join(' ')}
        styles={{
          body: drawerBodyStyle,
        }}
        footer={drawerFooter}
      >
        {children}
      </Drawer>
    )
  }

  return (
    <Modal
      {...rest}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText={okText}
      cancelText={cancelText}
      confirmLoading={confirmLoading}
      title={title}
      className={className}
      footer={footer}
      styles={styles}
      destroyOnHidden={destroyOnHidden}
    >
      {children}
    </Modal>
  )
}
