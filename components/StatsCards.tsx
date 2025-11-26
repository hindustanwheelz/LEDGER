import React from 'react';
import { Stats } from '../types';
import { formatCurrency } from '../utils';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Circle, Layers, Disc } from 'lucide-react';

interface StatsCardsProps {
  stats: Stats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="mb-8">
      {/* Financial Stats Row */}
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Financial Overview</h3>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Outstanding - The most important metric */}
        <div className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6 border-t-4 border-red-500">
          <dt>
            <div className="absolute rounded-md bg-red-100 p-3">
              <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">Total Outstanding</p>
          </dt>
          <dd className="ml-16 flex items-baseline pb-1 sm:pb-7">
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.outstanding)}</p>
          </dd>
        </div>

        <div className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6 border-t-4 border-blue-500">
          <dt>
            <div className="absolute rounded-md bg-blue-100 p-3">
              <TrendingUp className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">Total Invoiced</p>
          </dt>
          <dd className="ml-16 flex items-baseline pb-1 sm:pb-7">
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalInvoiced)}</p>
          </dd>
        </div>

        <div className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6 border-t-4 border-green-500">
          <dt>
            <div className="absolute rounded-md bg-green-100 p-3">
              <DollarSign className="h-6 w-6 text-green-600" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">Total Payments</p>
          </dt>
          <dd className="ml-16 flex items-baseline pb-1 sm:pb-7">
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalPaid)}</p>
          </dd>
        </div>

        <div className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6 border-t-4 border-purple-500">
          <dt>
            <div className="absolute rounded-md bg-purple-100 p-3">
              <TrendingDown className="h-6 w-6 text-purple-600" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">Total Credit Notes (CN)</p>
          </dt>
          <dd className="ml-16 flex items-baseline pb-1 sm:pb-7">
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalCN)}</p>
          </dd>
        </div>
      </div>

      {/* Product Category Stats Row */}
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Tyre Category Sales (Qty)</h3>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* PCR TYRE (contains 'R') */}
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-indigo-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <Disc className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">PCR TYRE</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.qtyPcr}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* NYLON (contains 'D') */}
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-orange-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-orange-100 rounded-md p-3">
                <Layers className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">NYLON</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.qtyNylon}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 2WHEELER (Numbers Only) */}
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-teal-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-teal-100 rounded-md p-3">
                <Circle className="h-6 w-6 text-teal-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">2WHEELER</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.qty2Wheeler}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};