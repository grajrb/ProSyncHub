import { Badge } from "@/components/ui/badge";

interface Asset {
  id: number;
  name: string;
  assetTag: string;
  currentStatus: string;
  locationId: number;
  manufacturer?: string;
  model?: string;
  updatedAt: string;
}

interface AssetCardProps {
  asset: Asset;
}

export default function AssetCard({ asset }: AssetCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-status-success text-white';
      case 'maintenance': return 'bg-status-warning text-white';
      case 'offline': return 'bg-status-error text-white';
      case 'error': return 'bg-status-error text-white';
      default: return 'bg-neutral-500 text-white';
    }
  };

  const getAssetIcon = (status: string) => {
    switch (status) {
      case 'operational': return 'fas fa-industry';
      case 'maintenance': return 'fas fa-wrench';
      case 'offline': return 'fas fa-power-off';
      case 'error': return 'fas fa-exclamation-triangle';
      default: return 'fas fa-cogs';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational': return 'Operational';
      case 'maintenance': return 'Maintenance';
      case 'offline': return 'Offline';
      case 'error': return 'Error';
      default: return status;
    }
  };

  const getLastUpdated = (updatedAt: string) => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffInMinutes = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    return updated.toLocaleDateString();
  };

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg hover:border-primary-300 transition-colors cursor-pointer ${
      asset.currentStatus === 'error' ? 'border-red-300 bg-red-50' :
      asset.currentStatus === 'maintenance' ? 'border-orange-300 bg-orange-50' :
      'border-neutral-200'
    }`}>
      <div className="flex items-center space-x-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          asset.currentStatus === 'operational' ? 'bg-gradient-to-br from-primary-400 to-primary-600' :
          asset.currentStatus === 'maintenance' ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
          asset.currentStatus === 'offline' ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
          'bg-gradient-to-br from-red-400 to-red-600'
        }`}>
          <i className={`${getAssetIcon(asset.currentStatus)} text-white`}></i>
        </div>
        <div>
          <h4 className="font-medium text-neutral-900">{asset.name}</h4>
          <p className="text-sm text-neutral-600">Location #{asset.locationId}</p>
          <p className="text-xs font-mono text-neutral-500">{asset.assetTag}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center space-x-2 mb-1">
          <Badge className={getStatusColor(asset.currentStatus)}>
            {getStatusText(asset.currentStatus)}
          </Badge>
          {asset.currentStatus === 'operational' && (
            <span className="text-sm font-mono text-neutral-700">Normal</span>
          )}
        </div>
        <p className="text-xs text-neutral-500">
          Last updated: {getLastUpdated(asset.updatedAt)}
        </p>
      </div>
    </div>
  );
}
