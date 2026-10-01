const fs=require('fs');
const edit=(f,pairs)=>{let s=fs.readFileSync(f,'utf8');const crlf=s.includes('\r\n');s=s.replace(/\r\n/g,'\n');for(const [a,b] of pairs){if(!s.includes(a)){console.error('MISS',f,a.slice(0,70));process.exit(1)}s=s.replace(a,()=>b)}if(crlf)s=s.replace(/\n/g,'\r\n');fs.writeFileSync(f,s)};
const f='frontend/src/homster/modules/admin/pages/Workers/AllWorkers.jsx';
edit(f,[
[`  const [zones, setZones] = useState([]);`,`  const [zones, setZones] = useState([]);
  const [professions, setProfessions] = useState([]);`],
[`      const [zonesRes, plansRes, catsRes] = await Promise.all([
        adminWorkerService.getZones().catch(() => ({ data: [] })),`,`      const [zonesRes, plansRes, catsRes, professionsRes] = await Promise.all([
        adminWorkerService.getZones().catch(() => ({ data: [] })),`],
[`        categoryService.getAll().catch(() => ({ data: [] }))
      ]);

      if (zonesRes?.data) setZones(zonesRes.data);`,`        categoryService.getAll().catch(() => ({ data: [] })),
        adminWorkerService.getProfessions().catch(() => ({ data: [] }))
      ]);

      if (zonesRes?.data) setZones(zonesRes.data);
      setProfessions((professionsRes?.data || []).filter((p) => p.isActive));`],
[`          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-800">Allowed Categories</label>`,`          {/* Profession: a bundle of categories. A worker holding one only gets those categories' bookings. */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-800">Profession</label>
              <span className="text-[11px] text-gray-400">
                Worker only receives bookings from the categories assigned to the selected profession.
              </span>
            </div>
            {professions.length === 0 ? (
              <p className="text-[11px] text-amber-600 p-3 bg-amber-50 rounded-lg border border-amber-100">
                No professions yet. Create one in Workers → Professions.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {professions.map((p) => {
                  const held = (editModal.formData.serviceCategories || []).some((c) => c.toLowerCase() === p.name.toLowerCase());
                  return (
                    <label key={p._id} className={\`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer text-xs \${held ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'}\`}>
                      <input
                        type="checkbox"
                        checked={held}
                        onChange={(e) => {
                          const current = editModal.formData.serviceCategories || [];
                          const rest = current.filter((c) => c.toLowerCase() !== p.name.toLowerCase());
                          setEditModal((prev) => ({
                            ...prev,
                            formData: { ...prev.formData, serviceCategories: e.target.checked ? [...rest, p.name] : rest }
                          }));
                        }}
                        className="w-4 h-4 mt-0.5 rounded text-emerald-600"
                      />
                      <span className="min-w-0">
                        <b className="block text-gray-900">{p.name}</b>
                        <span className="block text-[11px] text-gray-500">
                          {(p.categoryIds || []).map((c) => c.title).join(', ') || 'No categories assigned'}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-800">Allowed Categories</label>`]]);

edit('backend/services/locationService.js',[[`  if (filters?.categoryId && held.some(p => (p.categoryIds || []).some(id => String(id) === String(filters.categoryId)))) {
    return true;
  }
  return matchesWorkerCategory(plain, filters);`,`  // A worker who holds a profession is limited to that profession's categories.
  if (held.length > 0) {
    return !!filters?.categoryId && held.some(p => (p.categoryIds || []).some(id => String(id) === String(filters.categoryId)));
  }
  return matchesWorkerCategory(plain, filters);`],
[` * the categories the admin bundled under that profession — matched by category id, never
 * fuzzily. Any other entry keeps the legacy name matching.`,` * the categories the admin bundled under that profession — matched by category id, never
 * fuzzily — and the worker's other category names are ignored. A worker with no
 * profession keeps the legacy name matching.`]]);
