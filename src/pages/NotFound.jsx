import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const NotFound = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-10 border-border bg-surface/50">
            <div className="text-6xl mb-4">404</div>
            <h1 className="text-2xl font-bold text-white mb-2">Página no encontrada</h1>
            <p className="text-textMuted mb-6">La ruta que intentas visitar no existe.</p>
            <Link to="/dashboard">
                <Button className="w-full">Volver al inicio</Button>
            </Link>
        </Card>
    </div>
  );
};

export default NotFound;