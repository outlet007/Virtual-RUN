import Link from 'next/link';
import { MapPin, RotateCcw, Search } from 'lucide-react';
import { Badge, Button, Card, HeadingIcon, Input, Label, LinkButton } from '@/components/ui';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import {
  deleteRewardPickupLocation,
  setPrimaryRewardPickupLocation,
} from '@/lib/actions/reward-locations';
import {
  CreateRewardPickupLocationModal,
  EditRewardPickupLocationModal,
} from './reward-pickup-location-modal';

export type RewardPickupLocation = {
  id: string;
  name: string;
  name_en: string | null;
  address: string;
  address_en: string | null;
  contact_phone: string | null;
  contact_phone_en: string | null;
  maps_url: string | null;
  instructions: string | null;
  instructions_en: string | null;
  is_primary: boolean;
  is_active: boolean;
};

export function RewardPickupLocationsTab({
  locations,
  query,
  createLocation,
  editLocationId,
  error,
}: {
  locations: RewardPickupLocation[];
  query: string;
  createLocation: boolean;
  editLocationId?: string;
  error?: string;
}) {
  const searchNeedle = query.toLocaleLowerCase('th-TH');
  const filteredLocations = searchNeedle
    ? locations.filter((location) =>
        [location.name, location.name_en, location.address, location.address_en, location.contact_phone, location.contact_phone_en]
          .some((value) => (value ?? '').toLocaleLowerCase('th-TH').includes(searchNeedle)),
      )
    : locations;
  const editLocation = editLocationId
    ? locations.find((location) => location.id === editLocationId)
    : undefined;

  return (
    <div className='space-y-4'>
      <div className='flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='flex items-center gap-2 font-display text-xl font-bold'>
            <HeadingIcon name='mapPin' />
            สถานที่รับของรางวัล
          </h2>
          <p className='mt-1 text-sm text-ink/50'>สถานที่หลักจะถูกเลือกอัตโนมัติเมื่อเพิ่มรางวัลใหม่</p>
        </div>
        <div className='flex flex-wrap items-center justify-end gap-3'>
          <span className='font-mono text-sm text-ink/45 tnum'>{filteredLocations.length} สถานที่</span>
          <CreateRewardPickupLocationModal initialOpen={createLocation} error={createLocation ? error : undefined} />
        </div>
      </div>

      {!createLocation && !editLocationId && error && (
        <div className='rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700' role='alert'>{error}</div>
      )}

      <Card>
        <form method='get' className='space-y-4'>
          <input type='hidden' name='tab' value='locations' />
          <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end'>
            <div>
              <Label htmlFor='pickup-location-search'>ค้นหาสถานที่</Label>
              <div className='relative'>
                <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40' aria-hidden='true' />
                <Input
                  id='pickup-location-search'
                  name='location_q'
                  defaultValue={query}
                  placeholder='ชื่อสถานที่ ที่อยู่ หรือเบอร์ติดต่อ'
                  className='pl-9'
                />
              </div>
            </div>
            <Button type='submit' className='w-full sm:w-auto' icon='search'>ค้นหา</Button>
          </div>
          {query && (
            <Link
              href='/admin/rewards?tab=locations'
              className='inline-flex min-h-11 items-center gap-2 rounded-xl border border-lane px-4 text-sm font-semibold transition hover:bg-lane/50'
            >
              <RotateCcw className='size-4' aria-hidden='true' />
              ล้างการค้นหา
            </Link>
          )}
        </form>
      </Card>

      {filteredLocations.length === 0 ? (
        <Card className='text-center text-ink/50'>
          {query ? 'ไม่พบสถานที่ที่ตรงกับเงื่อนไข' : 'ยังไม่มีสถานที่รับของรางวัล'}
        </Card>
      ) : (
        <Card className='overflow-hidden p-0 sm:p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[760px] text-left text-sm'>
              <caption className='sr-only'>สถานที่รับของรางวัลทั้งหมด</caption>
              <thead className='bg-lane/35 text-xs text-ink/55'>
                <tr>
                  <th scope='col' className='px-4 py-3 font-semibold'>สถานที่</th>
                  <th scope='col' className='px-4 py-3 font-semibold'>ข้อมูลติดต่อ</th>
                  <th scope='col' className='px-4 py-3 font-semibold'>สถานะ</th>
                  <th scope='col' className='px-4 py-3 text-right font-semibold'>จัดการ</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-lane'>
                {filteredLocations.map((location) => (
                  <tr key={location.id} className='align-top transition hover:bg-lane/20'>
                    <td className='px-4 py-4'>
                      <div className='flex items-start gap-3'>
                        <span className='grid size-10 shrink-0 place-items-center rounded-lg bg-lane text-ink/40' aria-hidden='true'>
                          <MapPin className='size-4' />
                        </span>
                        <div className='min-w-0'>
                          <p className='font-semibold text-ink'>{location.name}</p>
                          {location.name_en && <p className='mt-0.5 text-xs text-ink/45'>{location.name_en}</p>}
                          <p className='mt-1 whitespace-pre-line text-xs leading-5 text-ink/55'>{location.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className='px-4 py-4 text-ink/60'>
                      <p>ไทย: {location.contact_phone || '-'}</p>
                      <p>English: {location.contact_phone_en || '-'}</p>
                      {location.maps_url && (
                        <a href={location.maps_url} target='_blank' rel='noreferrer' className='mt-1 inline-block text-primary-dark underline'>ดูแผนที่</a>
                      )}
                    </td>
                    <td className='px-4 py-4'>
                      <div className='flex flex-wrap gap-1.5'>
                        {location.is_primary && <Badge className='bg-primary-soft text-primary-dark'>สถานที่หลัก</Badge>}
                        <Badge className={location.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-lane text-ink/50'}>
                          {location.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </Badge>
                      </div>
                    </td>
                    <td className='px-4 py-4'>
                      <div className='flex flex-wrap justify-end gap-2'>
                        {!location.is_primary && location.is_active && (
                          <form action={setPrimaryRewardPickupLocation}>
                            <input type='hidden' name='id' value={location.id} />
                            <Button type='submit' variant='ghost' className='min-h-9 px-3 py-1'>ตั้งเป็นหลัก</Button>
                          </form>
                        )}
                        <LinkButton
                          href={`/admin/rewards?tab=locations&edit_location=${location.id}`}
                          variant='ghost'
                          icon='edit'
                          className='min-h-9 px-3 py-1'
                        >
                          แก้ไข
                        </LinkButton>
                        <form action={deleteRewardPickupLocation}>
                          <input type='hidden' name='id' value={location.id} />
                          <ConfirmDeleteButton
                            formAction={deleteRewardPickupLocation}
                            triggerLabel='ลบ'
                            title='ยืนยันการลบสถานที่'
                            description={`ต้องการลบสถานที่ “${location.name}” ใช่หรือไม่? สถานที่หลักหรือสถานที่ที่ยังผูกกับรางวัลจะไม่สามารถลบได้`}
                            className='min-h-9 border-red-200 px-3 py-1 text-red-700 hover:bg-red-50'
                          />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editLocation && (
        <EditRewardPickupLocationModal location={editLocation} error={error} />
      )}
    </div>
  );
}
