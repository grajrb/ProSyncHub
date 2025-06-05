import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { 
  addActiveSensorId, 
  removeActiveSensorId,
  setActiveSensorIds
} from '@/store/slices/analyticsSlice';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SensorItem {
  id: string;
  name: string;
  type: string;
  unit: string;
  assetId: number;
}

interface SensorSelectorProps {
  sensors: SensorItem[];
  loading?: boolean;
}

export default function SensorSelector({ sensors, loading = false }: SensorSelectorProps) {
  const dispatch = useDispatch();
  const { activeSensorIds } = useSelector((state: RootState) => state.analytics);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter sensors based on search term
  const filteredSensors = sensors.filter(sensor => 
    sensor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sensor.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group sensors by type
  const groupedSensors = filteredSensors.reduce((groups, sensor) => {
    const group = groups[sensor.type] || [];
    group.push(sensor);
    groups[sensor.type] = group;
    return groups;
  }, {} as Record<string, SensorItem[]>);

  const handleToggleSensor = (sensorId: string) => {
    if (activeSensorIds.includes(sensorId)) {
      dispatch(removeActiveSensorId(sensorId));
    } else {
      dispatch(addActiveSensorId(sensorId));
    }
  };

  const handleSelectAll = () => {
    dispatch(setActiveSensorIds(filteredSensors.map(sensor => sensor.id)));
  };

  const handleClearAll = () => {
    dispatch(setActiveSensorIds([]));
  };

  return (
    <Card className="border-neutral-200">
      <CardHeader>
        <CardTitle className="font-inter font-semibold text-neutral-900">Sensors</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Input 
            placeholder="Search sensors..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-sm"
          />
        </div>
        
        <div className="flex justify-between text-xs">
          <Button 
            variant="ghost" 
            className="text-primary-500 text-xs h-auto py-1 px-2" 
            onClick={handleSelectAll}
          >
            Select All
          </Button>
          <Button 
            variant="ghost" 
            className="text-primary-500 text-xs h-auto py-1 px-2" 
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse flex items-center space-x-2">
                <div className="h-4 w-4 bg-neutral-200 rounded"></div>
                <div className="h-4 bg-neutral-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {Object.entries(groupedSensors).map(([type, items]) => (
              <div key={type}>
                <h4 className="text-sm font-medium text-neutral-600 mb-2">{type}</h4>
                <div className="space-y-2 ml-2">
                  {items.map(sensor => (
                    <div key={sensor.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={sensor.id} 
                        checked={activeSensorIds.includes(sensor.id)}
                        onCheckedChange={() => handleToggleSensor(sensor.id)}
                      />
                      <label 
                        htmlFor={sensor.id} 
                        className="text-sm text-neutral-700 flex items-center justify-between w-full"
                      >
                        <span>{sensor.name}</span>
                        <span className="text-xs text-neutral-500">{sensor.unit}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {filteredSensors.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">
                No sensors found
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
