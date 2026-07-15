import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useModalStore } from '@/store/modalStore'
import { useUploadQueueStore } from '@/store/uploadQueueStore'

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset()
  })

  it('has initial state', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.roles).toEqual([])
  })

  it('sets user', () => {
    const user = { id: '1', email: 'test@test.com', full_name: 'Test', role: 'user' as const, isVerified: true, plan: 'free' as const, status: 'active' as const, createdAt: '', updatedAt: '' }
    useAuthStore.getState().setUser(user)
    expect(useAuthStore.getState().user).toEqual(user)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('checks roles', () => {
    const user = { id: '1', email: 'test@test.com', full_name: 'Test', role: 'admin' as const, isVerified: true, plan: 'free' as const, status: 'active' as const, createdAt: '', updatedAt: '' }
    useAuthStore.getState().setUser(user)
    expect(useAuthStore.getState().hasRole('admin')).toBe(true)
    expect(useAuthStore.getState().hasRole('super_admin')).toBe(false)
  })

  it('resets state', () => {
    const user = { id: '1', email: 'test@test.com', full_name: 'Test', role: 'user' as const, isVerified: true, plan: 'free' as const, status: 'active' as const, createdAt: '', updatedAt: '' }
    useAuthStore.getState().setUser(user)
    useAuthStore.getState().reset()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})

describe('UIStore', () => {
  it('has default theme', () => {
    expect(useUIStore.getState().theme).toBe('dark')
  })

  it('toggles sidebar', () => {
    const initial = useUIStore.getState().sidebarCollapsed
    useUIStore.getState().toggleSidebarCollapsed()
    expect(useUIStore.getState().sidebarCollapsed).toBe(!initial)
  })

  it('sets search open', () => {
    useUIStore.getState().setSearchOpen(true)
    expect(useUIStore.getState().searchOpen).toBe(true)
  })
})

describe('ModalStore', () => {
  it('opens and closes modals', () => {
    useModalStore.getState().open('test-modal', { id: 1 })
    expect(useModalStore.getState().isOpen('test-modal')).toBe(true)
    expect(useModalStore.getState().getData('test-modal')).toEqual({ id: 1 })

    useModalStore.getState().close('test-modal')
    expect(useModalStore.getState().isOpen('test-modal')).toBe(false)
  })

  it('closes all modals', () => {
    useModalStore.getState().open('modal-1')
    useModalStore.getState().open('modal-2')
    useModalStore.getState().closeAll()
    expect(useModalStore.getState().isOpen('modal-1')).toBe(false)
    expect(useModalStore.getState().isOpen('modal-2')).toBe(false)
  })
})

describe('UploadQueueStore', () => {
  it('adds upload to queue', () => {
    useUploadQueueStore.getState().add('file-1', 'test.pdf', 1024)
    expect(useUploadQueueStore.getState().uploads).toHaveLength(1)
    expect(useUploadQueueStore.getState().uploads[0].fileName).toBe('test.pdf')
  })

  it('updates progress', () => {
    useUploadQueueStore.getState().add('file-1', 'test.pdf', 1000)
    useUploadQueueStore.getState().updateProgress('file-1', 500)
    expect(useUploadQueueStore.getState().uploads[0].percentage).toBe(50)
  })

  it('completes upload', () => {
    useUploadQueueStore.getState().add('file-1', 'test.pdf', 1000)
    useUploadQueueStore.getState().complete('file-1')
    expect(useUploadQueueStore.getState().uploads[0].status).toBe('completed')
  })

  it('handles errors', () => {
    useUploadQueueStore.getState().add('file-1', 'test.pdf', 1000)
    useUploadQueueStore.getState().error('file-1', 'Upload failed')
    expect(useUploadQueueStore.getState().uploads[0].status).toBe('error')
    expect(useUploadQueueStore.getState().uploads[0].error).toBe('Upload failed')
  })

  it('removes upload', () => {
    useUploadQueueStore.getState().add('file-1', 'test.pdf', 1000)
    useUploadQueueStore.getState().remove('file-1')
    expect(useUploadQueueStore.getState().uploads).toHaveLength(0)
  })

  it('clears all uploads', () => {
    useUploadQueueStore.getState().add('file-1', 'test.pdf', 1000)
    useUploadQueueStore.getState().add('file-2', 'test2.pdf', 2000)
    useUploadQueueStore.getState().clear()
    expect(useUploadQueueStore.getState().uploads).toHaveLength(0)
  })
})
