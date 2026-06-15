import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function NewSessionPage() {
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [objective, setObjective] = useState('')

  const createMutation = useMutation({
    mutationFn: api.createSession,
    onSuccess: async (session) => {
      await api.runWorkflow(session.id)
      navigate(`/sessions/${session.id}`, { state: { expectRunning: true } })
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
          <CardDescription>
            Enter company details and your research objective. The AI workflow will generate a
            structured meeting briefing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Stripe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://stripe.com"
                type="url"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objective">Research Objective</Label>
              <Textarea
                id="objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g. Prepare for an enterprise sales meeting to discuss payment infrastructure integration..."
                required
                minLength={10}
              />
            </div>
            {createMutation.isError && (
              <p className="text-sm text-destructive">{(createMutation.error as Error).message}</p>
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
