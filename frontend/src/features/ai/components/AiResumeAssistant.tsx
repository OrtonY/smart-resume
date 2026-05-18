import { HistoryOutlined, MessageOutlined, PlusOutlined, RobotOutlined, SettingOutlined, CloudDownloadOutlined } from '@ant-design/icons'
import { App, Button, Empty, Form, Input, List, Modal, Select, Segmented, Spin, Tag, Typography } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getAiConfiguration, getAiVendors, listAiChatConversations, listAiChatMessages, listAiModels, saveAiConfiguration, streamAiChat } from '../api/aiApi'
import type { AiChatConversation, AiChatMessage, AiConfigurationRequest, AiResumeContext, VendorMetadata } from '../types'
import type { ResumeDetail } from '../../resume/types'
import { toAiResumeContext } from '../resumeContext'

const { Text } = Typography
const { TextArea } = Input

type AiChatUiMessage = AiChatMessage & {
  id: string
}

export function AiConfigurationButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button icon={<SettingOutlined />} onClick={() => setOpen(true)}>
        AI 配置
      </Button>
      <AiConfigurationModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function AiResumeAssistant({ draft }: { draft: ResumeDetail }) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [conversations, setConversations] = useState<AiChatConversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AiChatUiMessage[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat')
  const [position, setPosition] = useState({ x: window.innerWidth - 96, y: window.innerHeight - 112 })
  const dragState = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null)

  const resumeContext = useMemo<AiResumeContext>(() => toAiResumeContext(draft), [draft])

  function handleOpen() {
    setSelectedConversationId(null)
    setMessages([])
    setActiveTab('chat')
    setOpen(true)
  }

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setLoadingConversations(true)
        }
        return listAiChatConversations(draft.id)
      })
      .then((items) => {
        if (cancelled) {
          return
        }
        setConversations(items)
      })
      .catch((error) => {
        void message.error(error instanceof Error ? error.message : 'Failed to load AI chat conversations')
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingConversations(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [draft.id, message, open])

  useEffect(() => {
    if (!open || !selectedConversationId || streaming) {
      return
    }

    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setLoadingMessages(true)
        }
        return listAiChatMessages(draft.id, selectedConversationId)
      })
      .then((history) => {
        if (cancelled) {
          return
        }
        setMessages(history.map((item, index) => ({
          id: `${selectedConversationId}-${index}-${item.role}`,
          role: item.role,
          content: item.content,
        })))
      })
      .catch((error) => {
        void message.error(error instanceof Error ? error.message : 'Failed to load AI chat history')
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingMessages(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [draft.id, message, open, selectedConversationId, streaming])

  async function handleSend() {
    const content = input.trim()
    if (!content || streaming) {
      return
    }

    const userMessage: AiChatUiMessage = { id: crypto.randomUUID(), role: 'user', content }
    const assistantId = crypto.randomUUID()
    const assistantMessage: AiChatUiMessage = { id: assistantId, role: 'assistant', content: '' }

    setMessages((current) => [...current, userMessage, assistantMessage])
    setInput('')
    setStreaming(true)
    let activeConversationId = selectedConversationId

    try {
      await streamAiChat({
        message: content,
        conversationId: selectedConversationId ?? undefined,
        resume: resumeContext,
      }, (event) => {
        if (event.type === 'error') {
          throw new Error(event.content || 'AI chat failed')
        }
        if (event.type === 'done') {
          return
        }
        if (event.conversationId && event.conversationId !== selectedConversationId) {
          activeConversationId = event.conversationId
        }
        setMessages((current) => current.map((item) => (
          item.id === assistantId ? { ...item, content: item.content + event.content } : item
        )))
      })
      await refreshConversations(activeConversationId)
    } catch (error) {
      void message.error(error instanceof Error ? error.message : 'AI chat failed')
      setMessages((current) => current.filter((item) => item.id !== assistantId))
    } finally {
      setStreaming(false)
    }
  }

  async function refreshConversations(preferredConversationId?: string | null) {
    const items = await listAiChatConversations(draft.id)
    setConversations(items)
    if (preferredConversationId && items.some((item) => item.conversationId === preferredConversationId)) {
      setSelectedConversationId(preferredConversationId)
      return
    }
    setSelectedConversationId((current) => current ?? items[0]?.conversationId ?? null)
  }

  function startNewChat() {
    if (streaming) {
      return
    }
    setSelectedConversationId(null)
    setMessages([])
    setActiveTab('chat')
  }

  function selectConversation(conversationId: string) {
    if (streaming) {
      return
    }
    setSelectedConversationId(conversationId)
    setActiveTab('chat')
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragState.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    const nextX = Math.max(12, Math.min(window.innerWidth - 76, drag.originX + event.clientX - drag.startX))
    const nextY = Math.max(12, Math.min(window.innerHeight - 76, drag.originY + event.clientY - drag.startY))
    setPosition({ x: nextX, y: nextY })
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragState.current
    dragState.current = null
    if (!drag) {
      return
    }
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (Math.abs(event.clientX - drag.startX) < 4 && Math.abs(event.clientY - drag.startY) < 4) {
      handleOpen()
    }
  }

  return (
    <>
      <button
        className="ai-floating-trigger"
        style={{ left: position.x, top: position.y }}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-label="AI resume assistant"
      >
        <RobotOutlined />
        <span>AI</span>
      </button>

      <Modal
        open={open}
        title="AI 简历助手"
        onCancel={() => setOpen(false)}
        footer={null}
        width={640}
        destroyOnHidden={false}
      >
        <div className="ai-chat-panel">
          <div className="ai-chat-toolbar">
            <Segmented
              value={activeTab}
              onChange={(value) => setActiveTab(value as 'chat' | 'history')}
              options={[
                { label: <span><MessageOutlined /> 当前对话</span>, value: 'chat' },
                { label: <span><HistoryOutlined /> 历史记录</span>, value: 'history' },
              ]}
            />
            <Button icon={<PlusOutlined />} onClick={startNewChat} disabled={streaming}>
              新对话
            </Button>
          </div>

          <div className="ai-chat-context">
            <Tag color="blue">已绑定当前简历</Tag>
            <Text strong>{draft.title}</Text>
            {selectedConversationId ? <Tag color="default">续聊中</Tag> : <Tag color="green">新对话</Tag>}
          </div>

          {activeTab === 'history' ? (
            <Spin spinning={loadingConversations}>
              <List
                className="ai-chat-conversation-list"
                dataSource={conversations}
                locale={{ emptyText: '暂无历史对话' }}
                renderItem={(item) => (
                  <List.Item
                    className={item.conversationId === selectedConversationId ? 'is-active' : ''}
                    onClick={() => selectConversation(item.conversationId)}
                  >
                    <List.Item.Meta
                      title={item.title}
                      description={new Date(item.updatedAt).toLocaleString()}
                    />
                  </List.Item>
                )}
              />
            </Spin>
          ) : (
            <div className="ai-chat-main">
              <Spin spinning={loadingMessages}>
                <div className="ai-chat-messages">
                  {messages.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="向 AI 提问以审阅或优化当前简历。" />
                  ) : null}
                  {messages.map((item) => (
                    <div className={`ai-chat-message ai-chat-message--${item.role}`} key={item.id}>
                      <div className="ai-chat-message__bubble">
                        {item.content || (item.role === 'assistant' ? 'AI 正在回复...' : '')}
                      </div>
                    </div>
                  ))}
                </div>
              </Spin>
              <div className="ai-chat-composer">
                <TextArea
                  rows={3}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onPressEnter={(event) => {
                    if (!event.shiftKey) {
                      event.preventDefault()
                      void handleSend()
                    }
                  }}
                  placeholder="向 AI 提问关于当前简历的问题..."
                />
                <Button
                  type="primary"
                  icon={<MessageOutlined />}
                  loading={streaming}
                  onClick={() => void handleSend()}
                >
                  发送
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

function AiConfigurationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp()
  const [form] = Form.useForm<AiConfigurationRequest>()
  const selectedVendor = Form.useWatch('vendor', form)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [vendorMetadataList, setVendorMetadataList] = useState<VendorMetadata[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  const [fetchedModels, setFetchedModels] = useState<string[] | null>(null)

  const currentVendorMeta = useMemo(
    () => vendorMetadataList.find((m) => m.vendor === selectedVendor),
    [vendorMetadataList, selectedVendor],
  )

  const modelOptions = useMemo(
    () => fetchedModels ?? currentVendorMeta?.suggestedModels ?? [],
    [fetchedModels, currentVendorMeta],
  )

  const vendorOptions = useMemo(() => {
    if (vendorMetadataList.length > 0) {
      return vendorMetadataList.map((m) => ({ label: m.vendor, value: m.vendor }))
    }
    return [
      { label: 'OpenAI', value: 'OpenAI' },
      { label: 'Ollama', value: 'Ollama' },
      { label: 'DeepSeek', value: 'DeepSeek' },
    ]
  }, [vendorMetadataList])

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setLoading(true)
        }
        return Promise.all([getAiConfiguration(), getAiVendors()])
      })
      .then(([configuration, vendors]) => {
        if (cancelled) {
          return
        }
        setConfigured(configuration.configured)
        setVendorMetadataList(vendors)
        form.setFieldsValue({
          vendor: configuration.vendor || 'OpenAI',
          baseUrl: configuration.baseUrl,
          apiKey: '',
          modelName: configuration.modelName,
        })
      })
      .catch((error) => {
        void message.error(error instanceof Error ? error.message : '加载 AI 配置失败')
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [form, message, open])

  async function handleFetchModels() {
    const values = form.getFieldsValue()
    setFetchingModels(true)
    try {
      const response = await listAiModels({
        vendor: values.vendor,
        baseUrl: values.baseUrl || undefined,
        apiKey: values.apiKey || undefined,
      })
      setFetchedModels(response.models)
      if (response.models.length === 0) {
        void message.info('未找到可用模型，请检查凭据和接口地址。')
      }
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '获取模型列表失败')
    } finally {
      setFetchingModels(false)
    }
  }

  async function handleSave() {
    const values = await form.validateFields()
    setSaving(true)
    try {
      await saveAiConfiguration(values)
      void message.success('AI 配置已保存')
      onClose()
    } catch (error) {
      void message.error(error instanceof Error ? error.message : '保存 AI 配置失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title="AI 配置"
      onCancel={onClose}
      onOk={() => void handleSave()}
      okText="保存"
      confirmLoading={saving}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" initialValues={{ vendor: 'OpenAI' }}>
          <Form.Item name="vendor" label="AI 供应商" rules={[{ required: true, message: '请选择 AI 供应商' }]}>
            <Select options={vendorOptions} onChange={() => setFetchedModels(null)} />
          </Form.Item>
          <Form.Item name="baseUrl" label="接口地址">
            <Input placeholder={currentVendorMeta?.baseUrlPlaceholder ?? 'https://api.openai.com'} />
          </Form.Item>
          <Form.Item
            name="apiKey"
            label="API 密钥"
            rules={configured || currentVendorMeta?.apiKeyRequired === false ? [] : [{ required: true, message: '首次配置需要填写 API 密钥' }]}
            extra={configured ? '留空则保留已有密钥。' : (currentVendorMeta?.apiKeyRequired === false ? '该供应商无需 API 密钥。' : undefined)}
          >
            <Input.Password
              autoComplete="off"
              placeholder={currentVendorMeta?.apiKeyPlaceholder ?? (configured ? '留空保留已有密钥' : 'sk-...')}
            />
          </Form.Item>
          <Form.Item label="模型名称" required>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item name="modelName" noStyle rules={[{ required: true, message: '请输入模型名称' }]}>
                <Input placeholder={currentVendorMeta?.modelNamePlaceholder ?? 'gpt-4o-mini'} />
              </Form.Item>
              <Button
                icon={<CloudDownloadOutlined />}
                loading={fetchingModels}
                onClick={() => void handleFetchModels()}
              >
                获取模型
              </Button>
            </div>
            {modelOptions.length > 0 && (
              <ModelList models={modelOptions} onSelect={(model) => form.setFieldValue('modelName', model)} />
            )}
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  )
}

function ModelList({ models, onSelect }: { models: string[]; onSelect: (model: string) => void }) {
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter.trim()) return models
    const keyword = filter.toLowerCase()
    return models.filter((m) => m.toLowerCase().includes(keyword))
  }, [models, filter])

  return (
    <div style={{ marginTop: 8, border: '1px solid #d9d9d9', borderRadius: 6, padding: 8, maxHeight: 180, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Input
        size="small"
        placeholder="搜索模型..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        allowClear
        style={{ marginBottom: 6 }}
      />
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>无匹配模型</Text>
        ) : (
          filtered.map((model) => (
            <div
              key={model}
              onClick={() => onSelect(model)}
              style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: 4, fontSize: 13 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {model}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
