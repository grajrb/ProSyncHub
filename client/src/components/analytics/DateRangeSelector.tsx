import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { setDateRange, setInterval } from '@/store/slices/analyticsSlice';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function DateRangeSelector() {
  const dispatch = useDispatch();
  const { dateRange, interval } = useSelector((state: RootState) => state.analytics);
  
  const [startDate, setStartDate] = useState(dateRange.start.split('T')[0]);
  const [endDate, setEndDate] = useState(dateRange.end.split('T')[0]);

  // Update the local state when the redux state changes
  useEffect(() => {
    setStartDate(dateRange.start.split('T')[0]);
    setEndDate(dateRange.end.split('T')[0]);
  }, [dateRange]);

  const handleApply = () => {
    dispatch(setDateRange({
      start: new Date(`${startDate}T00:00:00Z`).toISOString(),
      end: new Date(`${endDate}T23:59:59Z`).toISOString(),
    }));
  };

  const handleIntervalChange = (value: string) => {
    dispatch(setInterval(value as any));
  };

  const handlePresetRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    
    dispatch(setDateRange({
      start: start.toISOString(),
      end: end.toISOString(),
    }));
  };

  return (
    <Card className="border-neutral-200">
      <CardHeader>
        <CardTitle className="font-inter font-semibold text-neutral-900">Time Range</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center space-x-2">
          <div className="space-y-1 flex-1">
            <label htmlFor="start-date" className="text-xs text-neutral-600">Start Date</label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1 flex-1">
            <label htmlFor="end-date" className="text-xs text-neutral-600">End Date</label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <label htmlFor="interval" className="text-xs text-neutral-600">Interval</label>
          <Select value={interval} onValueChange={handleIntervalChange}>
            <SelectTrigger id="interval" className="text-sm">
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minute">Minute</SelectItem>
              <SelectItem value="hour">Hour</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs" 
            onClick={() => handlePresetRange(7)}
          >
            Last 7 Days
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs" 
            onClick={() => handlePresetRange(30)}
          >
            Last 30 Days
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs" 
            onClick={() => handlePresetRange(90)}
          >
            Last 90 Days
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs" 
            onClick={() => handlePresetRange(365)}
          >
            Last Year
          </Button>
        </div>
        
        <Button onClick={handleApply} className="w-full text-sm">
          Apply
        </Button>
      </CardContent>
    </Card>
  );
}
