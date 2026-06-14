import { Outlet } from 'react-router-dom'

import { SidebarProvider } from '@/components/ui/sidebar'

import { ChatHeader } from './_components/chat-header'
import { ChatSidebar } from './_components/chat-sidebar'

export default function ChatLayout() {
  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <ChatHeader />
        <div className="flex flex-1">
          <ChatSidebar />
          <Outlet />
        </div>
      </SidebarProvider>
    </div>
  )
}
