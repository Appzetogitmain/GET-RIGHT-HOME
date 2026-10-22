const fs=require('fs');
const f='index.jsx';
let s=fs.readFileSync(f,'utf8');const crlf=s.includes('\r\n');s=s.replace(/\r\n/g,'\n');
const rep=(a,b)=>{if(!s.includes(a)){console.error('MISS',a.slice(0,60));process.exit(1)}s=s.replace(a,()=>b)};
rep(`import LogoLoader from '../../../../components/common/LogoLoader';`,`import LogoLoader from '../../../../components/common/LogoLoader';
import ErrorBoundary from '../../components/common/ErrorBoundary';`);
rep(`  const [isAutoCenter, setIsAutoCenter] = useState(true);`,`  const [isAutoCenter, setIsAutoCenter] = useState(true);
  const [loadError, setLoadError] = useState('');`);
// log + surface fetch errors instead of an endless loader
rep(`    } catch (error) {
      // Error fetching booking
    } finally {
      if (isFirstLoad) setLoading(false);`,`    } catch (error) {
      console.error('[BookingTrack] could not load booking:', error);
      if (isFirstLoad) setLoadError(error?.response?.data?.message || error?.message || 'Could not load this booking');
    } finally {
      if (isFirstLoad) setLoading(false);`);
rep(`  if (!isLoaded || loading || !booking) return <LogoLoader />;`,`  if (!isLoaded || loading) return <LogoLoader />;
  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white p-6 text-center">
        <p className="text-base font-bold text-gray-800">Could not load live tracking</p>
        <p className="text-sm text-gray-500">{loadError || 'This booking could not be loaded.'}</p>
        <div className="flex gap-2">
          <button onClick={() => window.location.reload()} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white">Retry</button>
          <button onClick={() => navigate(\`/user/booking/\${id}\`)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700">Back</button>
        </div>
      </div>
    );
  }`);
// map script failing (bad key / blocked) must not leave a blank page either
rep(`  const { isLoaded } = useJsApiLoader({`,`  const { isLoaded, loadError: mapsLoadError } = useJsApiLoader({`);
rep(`  if (!isLoaded || loading) return <LogoLoader />;`,`  if (mapsLoadError) {
    console.error('[BookingTrack] Google Maps failed to load:', mapsLoadError);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white p-6 text-center">
        <p className="text-base font-bold text-gray-800">Map could not be loaded</p>
        <p className="text-sm text-gray-500">Check your internet connection and try again.</p>
        <button onClick={() => window.location.reload()} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white">Retry</button>
      </div>
    );
  }
  if (!isLoaded || loading) return <LogoLoader />;`);
// wrap the page in an error boundary
rep(`export default BookingTrack;`,`const BookingTrackWithBoundary = () => (
  <ErrorBoundary>
    <BookingTrack />
  </ErrorBoundary>
);

export default BookingTrackWithBoundary;`);
if(crlf)s=s.replace(/\n/g,'\r\n');fs.writeFileSync(f,s);
