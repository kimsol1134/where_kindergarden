'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface RatioData {
  name: string;
  value: number;
  unit: string;
  color: string;
  description?: string;
  subValue?: string;
}

interface RatioBarChartProps {
  data: RatioData[];
  title: string;
}

export function RatioBarChart({ data, title }: RatioBarChartProps) {
  return (
    <div className="flex flex-col h-full">
      <h4 className="text-sm font-bold text-gray-900 mb-4 text-center">{title}</h4>
      
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
            barSize={60}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#4B5563', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              hide={true} 
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              content={({ active, payload }: { active?: boolean; payload?: any }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-100 text-xs">
                      <div className="font-bold text-gray-900 mb-1">{data.name}</div>
                      <div className="text-emerald-600 font-medium">
                        {data.description}: {data.value}{data.unit}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend / Info */}
      <div className="mt-4 space-y-3 px-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-600">{item.name}</span>
            </div>
            <div className="text-sm font-bold text-gray-900">
              {item.value}
              <span className="font-normal text-gray-500 ml-0.5">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
