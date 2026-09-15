import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, EmptyState } from '@/components/ui/Primitives'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Card padded={false}>
      <EmptyState
        icon={<Compass className="size-5" />}
        title="Esta página no existe"
        description="La ruta que buscaba no está disponible. Puede volver al panel o usar la búsqueda con Ctrl+K."
        action={
          <Button variant="primary" onClick={() => navigate('/')}>
            Ir al panel
          </Button>
        }
      />
    </Card>
  )
}
