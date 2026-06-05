import React from 'react';

const TicketTemplate = React.forwardRef(({ sale, tenant, activeRate }, ref) => {
    if (!sale) return null;
    
    // Config: usd, ves, or both
    const displayConfig = tenant?.exchange_rate_config?.ticket_currency_display || 'both';
    const showUSD = displayConfig === 'both' || displayConfig === 'usd';
    const showVES = displayConfig === 'both' || displayConfig === 'ves';
    
    const customer = sale.customer;
    const isGeneric = !customer || customer.name === 'Cliente Genérico' || !customer.id_number;

    return (
        <div 
            ref={ref} 
            className="bg-white text-black p-6 w-[400px] shadow-sm font-mono text-sm leading-tight flex flex-col"
            style={{ fontFamily: 'monospace' }}
        >
            {/* Cabecera */}
            <div className="text-center mb-6 border-b-2 border-black pb-4 border-dashed">
                <h1 className="font-bold text-2xl uppercase break-words mb-1">
                    {tenant?.company_name || 'Comercio'}
                </h1>
                {tenant?.document_id && (
                    <p className="text-sm font-semibold mb-1">RIF/CI: {tenant.document_id}</p>
                )}
                <h2 className="font-bold text-xl mt-4 tracking-widest uppercase">COMPROBANTE</h2>
                <p className="text-xs mt-2 text-gray-600">
                    Nro: {String(sale.id).padStart(6, '0')}<br/>
                    Fecha: {new Date(sale.created_at || Date.now()).toLocaleString('es-VE')}
                </p>
            </div>

            {/* Cliente */}
            <div className="mb-6 border-b-2 border-black pb-4 border-dashed">
                <h3 className="font-bold text-base mb-2 uppercase">Datos del Cliente</h3>
                {isGeneric ? (
                    <p className="font-bold">CLIENTE GENÉRICO</p>
                ) : (
                    <>
                        <p><span className="font-bold">Nombre:</span> {customer.name}</p>
                        {customer.id_number && <p><span className="font-bold">CI/RIF:</span> {customer.id_number}</p>}
                        {customer.phone && <p><span className="font-bold">Telf:</span> {customer.phone}</p>}
                    </>
                )}
            </div>

            {/* Productos */}
            <div className="mb-6 border-b-2 border-black pb-4 border-dashed">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="py-2 w-1/2 uppercase">Producto</th>
                            <th className="py-2 text-center w-1/6 uppercase">Cant</th>
                            <th className="py-2 text-right w-1/3 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items?.map((item, index) => {
                            const name = item.product?.name || 'Producto genérico';
                            const qty = parseFloat(item.quantity);
                            const priceUSD = parseFloat(item.unit_price_usd);
                            const totalUSD = qty * priceUSD;
                            const priceVES = priceUSD * activeRate;
                            const totalVES = totalUSD * activeRate;
                            
                            return (
                                <tr key={index} className="align-top border-b border-gray-300 last:border-0">
                                    <td className="py-3 pr-2 break-words">
                                        <div className="font-bold">{name}</div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            Und: {showUSD && `$${priceUSD.toFixed(2)}`} 
                                            {showUSD && showVES && ' | '}
                                            {showVES && `Bs${priceVES.toFixed(2)}`}
                                        </div>
                                    </td>
                                    <td className="py-3 text-center font-bold">{qty}</td>
                                    <td className="py-3 text-right font-bold whitespace-nowrap">
                                        {showUSD && <div>${totalUSD.toFixed(2)}</div>}
                                        {showVES && <div>Bs {totalVES.toFixed(2)}</div>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Totales */}
            <div className="text-right">
                <h3 className="font-bold uppercase text-lg mb-2">Total a Pagar</h3>
                {showUSD && (
                    <div className="text-2xl font-black mb-1">
                        $ {parseFloat(sale.total_usd).toFixed(2)}
                    </div>
                )}
                {showVES && (
                    <div className="text-xl font-bold text-gray-800">
                        Bs {(parseFloat(sale.total_usd) * activeRate).toFixed(2)}
                    </div>
                )}
            </div>

            {/* Información de Crédito */}
            {(sale.status === 'pending_credit' || sale.credit) && (
                <div className="mt-6 border-t-2 border-black border-dashed pt-4">
                    <h3 className="font-bold text-center uppercase text-sm mb-2 border border-black p-1">Nota de Crédito (Fiado)</h3>
                    <p className="text-xs text-justify mb-3">
                        El cliente se compromete a cancelar la totalidad de la deuda en las fechas acordadas. El incumplimiento puede generar recargos o suspensión del servicio.
                    </p>
                    
                    {sale.credit?.installments && sale.credit.installments.length > 0 && (
                        <table className="w-full text-xs text-left mb-2">
                            <thead>
                                <tr className="border-b border-black">
                                    <th className="py-1">Cuota</th>
                                    <th className="py-1">Fecha Límite</th>
                                    <th className="py-1 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.credit.installments.map((inst, idx) => (
                                    <tr key={idx} className="border-b border-gray-200 last:border-0">
                                        <td className="py-1">{idx + 1}</td>
                                        <td className="py-1">{new Date(inst.due_date).toLocaleDateString('es-VE')}</td>
                                        <td className="py-1 text-right font-bold">
                                            {showUSD && <div>${parseFloat(inst.amount_usd).toFixed(2)}</div>}
                                            {showVES && <div>Bs {(parseFloat(inst.amount_usd) * activeRate).toFixed(2)}</div>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <div className="text-right text-xs font-bold mt-2">
                        Total Deuda: {showUSD ? `$${parseFloat(sale.credit?.total_debt_usd || sale.total_usd).toFixed(2)}` : ''} 
                        {showUSD && showVES && ' / '} 
                        {showVES ? `Bs${(parseFloat(sale.credit?.total_debt_usd || sale.total_usd) * activeRate).toFixed(2)}` : ''}
                    </div>
                </div>
            )}
            
            <div className="mt-8 text-center text-xs text-gray-500 font-bold uppercase">
                ¡Gracias por su compra!
            </div>
        </div>
    );
});

TicketTemplate.displayName = 'TicketTemplate';

export default TicketTemplate;
