'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DonutChartData {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  title: string;
  totalLabel: string;
  totalValue: number;
  totalUnit?: string;
  valueUnit?: string;
}

export function DonutChart({
  data,
  title,
  totalLabel,
  totalValue,
  totalUnit = '개',
  valueUnit = '개',
}: DonutChartProps) {
  // 데이터가 없는 경우 처리
  if (totalValue === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-gray-400">
        <div className="text-sm">데이터가 없습니다</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h4 className="text-sm font-bold text-gray-900 mb-4 text-center">{title}</h4>
      
      <div className="relative h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number | undefined) => [value !== undefined ? `${value}${valueUnit}` : '', '']}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Text */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-xs text-gray-500 font-medium">{totalLabel}</div>
          <div className="text-lg font-bold text-gray-900">
            {totalValue}
            <span className="text-sm font-normal text-gray-500 ml-0.5">{totalUnit}</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-900">
                {item.value}{valueUnit}
              </span>
              <span className="text-gray-400 w-12 text-right">
                {((item.value / totalValue) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
