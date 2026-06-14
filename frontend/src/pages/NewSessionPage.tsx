import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export function NewSessionPage() {
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [objective, setObjective] = useState('')

  const createMutation = useMutation({
    mutationFn: api.createSession,
    onSuccess: async (session) => {
      await api.runWorkflow(session.id)
      navigate(`/sessions/${session.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({ company_name: companyName, website, objective })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>New Research Session</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Enter company details and your research objective. The AI workflow will generate a
            structured meeting briefing.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Stripe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://stripe.com"
                type="url"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Research Objective
              </label>
              <Textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g. Prepare for an enterprise sales meeting to discuss payment infrastructure integration..."
                required
                minLength={10}
              />
            </div>
            {createMutation.isError && (
              <p className="text-sm text-red-600">{(createMutation.error as Error).message}</p>
            )}
            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? 'Creating & Starting Research...' : 'Create & Run Research'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
