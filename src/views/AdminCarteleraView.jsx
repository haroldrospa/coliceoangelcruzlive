import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Form, Input, InputNumber, Select, Row, Col, 
  Button, Typography, Space, App as AntApp, Tag, Divider, Alert, Tooltip, Modal, Tabs 
} from 'antd';
import { 
  PlusOutlined, FilePdfOutlined, LockOutlined, UnlockOutlined, 
  ThunderboltFilled, SaveOutlined, DeleteOutlined, EditOutlined, CloseOutlined
} from '@ant-design/icons';
import { supabase, rawFetch } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;
const { Option } = Select;

const colors = ['Indio', 'Joco', 'Jabao', 'Cenizo', 'Canelo', 'Blanco'];

const AdminCarteleraView = () => {
  const { message } = AntApp.useApp();
  const [fights, setFights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [roosters, setRoosters] = useState([]);
  const [activeTab, setActiveTab] = useState('cartelera');
  const [form] = Form.useForm();
  const [roosterForm] = Form.useForm();
  const [proposedFights, setProposedFights] = useState([]);
  const [unmatchedRoosters, setUnmatchedRoosters] = useState([]);
  const [editingRoosterId, setEditingRoosterId] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [nextTurn, setNextTurn] = useState(1);
  const [weightDiff, setWeightDiff] = useState(0);

  useEffect(() => {
    fetchFights();
  }, []);

  const fetchFights = async () => {
    setLoading(true);
    try {
      const fightsData = await rawFetch('cartelera_fights?select=*&order=numero_pelea.asc');
      if (fightsData) {
        setFights(fightsData);
        setIsLocked(fightsData.some(f => f.locked));
      }
      
      const poolData = await rawFetch('cartelera_roosters?select=*&status=eq.PENDING&order=total_oz.asc');
      if (poolData) {
        setRoosters(poolData);
        // Calculate max turn to set nextTurn
        const maxTurn = poolData.reduce((max, r) => Math.max(max, parseInt(r.turno || 0)), 0);
        setNextTurn(maxTurn + 1);
        roosterForm.setFieldsValue({ turno: maxTurn + 1 });
      }
    } catch (e) {
      message.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const addRoosterToPool = async (values) => {
    setLoading(true);
    try {
      const weightStr = values.peso_input || '0,0.0';
      const [lbsPart, rest] = weightStr.split(',');
      const [ozPart, ptsPart] = (rest || '0.0').split('.');
      
      const payload = {
        turno: values.turno,
        clase: values.clase,
        traba: values.traba,
        marca: values.marca,
        color: values.color,
        peso_libras: parseInt(lbsPart || 0),
        peso_onzas: parseInt(ozPart || 0),
        peso_puntos: parseInt(ptsPart || 0)
      };

      if (editingRoosterId) {
        await rawFetch('cartelera_roosters', {
          method: 'PATCH',
          body: payload,
          query: `id=eq.${editingRoosterId}`
        });
        message.success('Gallo actualizado en el depósito');
        setEditingRoosterId(null);
      } else {
        await rawFetch('cartelera_roosters', {
          method: 'POST',
          body: payload
        });
        message.success('Gallo registrado en depósito');
      }
      
      roosterForm.resetFields();
      fetchFights();
    } catch (e) {
      message.error(editingRoosterId ? 'Error al actualizar gallo' : 'Error al añadir gallo');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (rooster) => {
     setEditingRoosterId(rooster.id);
     roosterForm.setFieldsValue({
        turno: rooster.turno,
        clase: rooster.clase || '',
        traba: rooster.traba,
        marca: rooster.marca,
        color: rooster.color,
        peso_input: `${rooster.peso_libras},${rooster.peso_onzas}.${rooster.peso_puntos}`
     });
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
     setEditingRoosterId(null);
     roosterForm.resetFields();
     roosterForm.setFieldsValue({ turno: nextTurn });
  };

  const autoMatch = () => {
    if (roosters.length < 2) return message.warning('Necesitas al menos 2 gallos en el depósito');
    
    const potentialMatches = [];
    const sorted = [...roosters].sort((a, b) => a.total_oz - b.total_oz);
    const tempUsedIds = new Set();
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i+1];
      const diff = Math.abs(a.total_oz - b.total_oz);
      
      if (diff <= 3) { 
        potentialMatches.push({ sideA: a, sideB: b, diff });
        tempUsedIds.add(a.id);
        tempUsedIds.add(b.id);
        i++; 
      }
    }
    
    const unmatched = roosters.filter(r => !tempUsedIds.has(r.id));
    setUnmatchedRoosters(unmatched);
    setProposedFights(potentialMatches);
    
    if (potentialMatches.length === 0) {
      if (unmatched.length > 0) {
         message.info('Ningún gallo encontró pareja dentro del límite de 3oz.');
      } else {
         return message.info('Depósito vacío.');
      }
    }
    
    setIsPreviewModalOpen(true);
  };

  const confirmMatches = async () => {
    setLoading(true);
    try {
      for (const match of proposedFights) {
        const { sideA, sideB } = match;
        // 1. Create Fight
        await rawFetch('cartelera_fights', {
          method: 'POST',
          body: {
            traba_a: sideA.traba, peso_libras_a: sideA.peso_libras, peso_onzas_a: sideA.peso_onzas, peso_puntos_a: sideA.peso_puntos, color_a: sideA.color, turno_a: sideA.turno, marca_a: sideA.marca, clase_a: sideA.clase,
            traba_b: sideB.traba, peso_libras_b: sideB.peso_libras, peso_onzas_b: sideB.peso_onzas, peso_puntos_b: sideB.peso_puntos, color_b: sideB.color, turno_b: sideB.turno, marca_b: sideB.marca, clase_b: sideB.clase,
            posta: 0
          }
        });
        
        // 2. Mark as Matched
        await rawFetch('cartelera_roosters', {
            method: 'PATCH',
            body: { status: 'MATCHED' },
            query: `id=in.(${sideA.id},${sideB.id})`
        });
      }
      
      message.success(`${proposedFights.length} peleas asignadas a la cartelera`);
      setIsPreviewModalOpen(false);
      fetchFights();
    } catch (e) {
      message.error('Error al confirmar cruces');
    } finally {
      setLoading(false);
    }
  };

  const deleteFight = async (id) => {
    try {
      await rawFetch('cartelera_fights', {
        method: 'DELETE',
        query: `id=eq.${id}`
      });
      message.success('Pelea eliminada');
      fetchFights();
    } catch (e) {
      message.error('Error al eliminar');
    }
  };

  const deleteRooster = async (id) => {
    try {
      await rawFetch('cartelera_roosters', {
        method: 'DELETE',
        query: `id=eq.${id}`
      });
      message.success('Gallo eliminado del depósito');
      fetchFights();
    } catch (e) {
      message.error('Error al eliminar gallo');
    }
  };

  const calculateTotalOz = (values, side) => {
    const lbs = values[`peso_libras_${side}`] || 0;
    const oz = values[`peso_onzas_${side}`] || 0;
    const pts = values[`peso_puntos_${side}`] || 0;
    return (lbs * 16) + oz + (pts / 10);
  };

  const handleValuesChange = (_, allValues) => {
    const ozA = calculateTotalOz(allValues, 'a');
    const ozB = calculateTotalOz(allValues, 'b');
    setWeightDiff(Math.abs(ozA - ozB));
  };

  const handleSave = async (values) => {
    if (isLocked) return message.warning('La cartelera está cerrada para edición');
    
    setLoading(true);
    try {
      await rawFetch('cartelera_fights', {
        method: 'POST',
        body: values
      });
      message.success('Pelea registrada');
      setIsModalOpen(false);
      form.resetFields();
      fetchFights();
    } catch (e) {
      message.error('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = async () => {
    const newState = !isLocked;
    setLoading(true);
    try {
      // 1. Lock/Unlock Fights locally in the UI
      if (fights.length > 0) {
         const ids = fights.map(f => f.id).join(',');
         await rawFetch('cartelera_fights', {
           method: 'PATCH',
           body: { locked: newState },
           query: `id=in.(${ids})`
         });
      }
      setIsLocked(newState);
      
      // 2. If Locked, Publish to 'events' table for users to see
      if (newState && fights.length > 0) {
         // Create events for betting
         let publishCount = 0;
         for (const f of fights) {
            try {
               await rawFetch('events', {
                   method: 'POST',
                   body: {
                       post_number: f.numero_pelea.toString(),
                       gallo_a_name: f.traba_a,
                       gallo_b_name: f.traba_b,
                       gallo_a_weight: JSON.stringify({ weight: `${f.peso_libras_a}-${f.peso_onzas_a}.${f.peso_puntos_a}`, color: f.color_a, marca: f.marca_a, clase: f.clase_a, turno: f.turno_a }),
                       gallo_b_weight: JSON.stringify({ weight: `${f.peso_libras_b}-${f.peso_onzas_b}.${f.peso_puntos_b}`, color: f.color_b, marca: f.marca_b, clase: f.clase_b, turno: f.turno_b }),
                       status: 'LIVE'

                   }
               });
               publishCount++;
            } catch (postError) {
               console.error("Fallo publicando pelea:", f.numero_pelea);
            }
         }
         
         setNextTurn(1);
         roosterForm.setFieldsValue({ turno: 1 });
         message.success(`Cartelera Cerrada! ${publishCount} peleas publicadas EN VIVO.`);
      } else if (!newState) {
         message.info('Cartelera Abierta para nuevas asignaciones.');
      }
      fetchFights();
    } catch (e) {
      console.error(e);
      message.error('Error de seguridad al cambiar estado. Verifica la consola.');
    } finally {
        setLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    
    // ==========================================
    // 1. PREMIUM HEADER DESIGN (Emerald Block)
    // ==========================================
    doc.setFillColor(16, 185, 129); // Modern Emerald Green
    doc.rect(0, 0, doc.internal.pageSize.width, 140, 'F');
    
    // Add Logo cleanly on the left
    const logoUrl = '/logo_coliseo.png';
    doc.addImage(logoUrl, 'PNG', 40, 25, 90, 90);

    // Header Text - Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.text('COLISEO ANGEL CRUZ', 150, 60);
    
    // Header Text - Location
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(230, 245, 240); // Soft mint for contrast
    doc.text('Carrera de palmas, La Vega, frente a la entrada del Santo Cerro', 150, 80);
    
    // Header Text - Document Type
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('CARTELERA OFICIAL DE PESAJE', 150, 105);

    // ==========================================
    // 2. DOCUMENT METADATA
    // ==========================================
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha y Hora de Generación: ${new Date().toLocaleString()}`, 40, 165);
    
    // Separator line
    doc.setDrawColor(220, 230, 225);
    doc.line(40, 175, 550, 175);

    // ==========================================
    // 3. DATA PREPARATION
    // ==========================================
    const tableData = fights.map((f, i) => [
      f.numero_pelea,
      f.turno_a || '-',
      f.clase_a || '-',
      f.traba_a.toUpperCase(),
      f.marca_a || '-',
      `${f.peso_libras_a}-${f.peso_onzas_a}.${f.peso_puntos_a}`,
      f.color_a,
      'VS',
      f.turno_b || '-',
      f.clase_b || '-',
      f.traba_b.toUpperCase(),
      f.marca_b || '-',
      `${f.peso_libras_b}-${f.peso_onzas_b}.${f.peso_puntos_b}`,
      f.color_b
    ]);

    // ==========================================
    // 4. PREMIUM TABLE RENDERING
    // ==========================================
    autoTable(doc, {
      head: [['#', 'T', 'P', 'TRABA', 'MARCA', 'PESO', 'COLOR', '', 'T', 'P', 'TRABA', 'MARCA', 'PESO', 'COLOR']],
      body: tableData,
      startY: 195,
      theme: 'plain',
      styles: { 
        fontSize: 8, 
        cellPadding: 5, 
        valign: 'middle',
        font: "helvetica",
        lineWidth: { bottom: 0.5 },
        lineColor: [240, 240, 240]
      },
      headStyles: { 
        fillColor: [240, 248, 245], 
        textColor: [16, 185, 129], 
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', textColor: [50, 50, 50] },
        1: { halign: 'center', textColor: [100, 100, 100] },
        2: { halign: 'center', textColor: [212, 175, 55], fontStyle: 'bold' },
        3: { halign: 'right', fontStyle: 'bold', textColor: [20, 20, 20] }, 
        4: { halign: 'center', textColor: [100, 100, 100] },
        5: { halign: 'right', textColor: [80, 80, 80] },
        6: { halign: 'center', textColor: [80, 80, 80] },
        7: { halign: 'center', fontStyle: 'italic', textColor: [16, 185, 129] }, // VS
        8: { halign: 'center', textColor: [100, 100, 100] },
        9: { halign: 'center', textColor: [212, 175, 55], fontStyle: 'bold' },
        10: { halign: 'left', fontStyle: 'bold', textColor: [20, 20, 20] }, 
        11: { halign: 'center', textColor: [100, 100, 100] },
        12: { halign: 'left', textColor: [80, 80, 80] },
        13: { halign: 'center', textColor: [80, 80, 80] }
      },
      alternateRowStyles: { 
        fillColor: [252, 252, 252] 
      }
    });

    // ==========================================
    // 5. PROFESSIONAL FOOTER
    // ==========================================
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
       doc.setPage(i);
       doc.setFontSize(8);
       doc.setTextColor(150, 150, 150);
       doc.text(
         `Software Oficial del Coliseo Angel Cruz | Documento de Control Cifrado | Página ${i} de ${pageCount}`, 
         doc.internal.pageSize.width / 2, 
         doc.internal.pageSize.height - 30, 
         { align: 'center' }
       );
    }

    const pdfName = `Cartelera_AngelCruz_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(pdfName);
    message.success('PDF Premium exportado correctamente');
  };

  const columns = [
    { title: '#', dataIndex: 'numero_pelea', key: 'num', width: 40, align: 'center' },
    { 
      title: 'LADO AZUL (IZQUIERDO)', 
      className: 'column-group-border',
      children: [
        { title: 'T', dataIndex: 'turno_a', width: 40, align: 'center', render: t => <Text type="secondary">{t || '-'}</Text> },
        { title: 'P', dataIndex: 'clase_a', width: 40, align: 'center', render: c => c ? <Tag color="gold" style={{ margin: 0 }}>{c}</Tag> : '-' },
        { title: 'Traba', dataIndex: 'traba_a' },
        { title: 'Marca', dataIndex: 'marca_a', align: 'center', render: m => m || '-' },
        { title: 'Peso', render: (_, r) => <Text style={{ color: '#10b981', fontWeight: 600 }}>{r.peso_libras_a}-{r.peso_onzas_a}.{r.peso_puntos_a}</Text> },
        { title: 'Color', dataIndex: 'color_a' },
      ]
    },
    { 
      title: 'VS', 
      align: 'center',
      width: 50,
      render: () => <ThunderboltFilled style={{ color: '#10b981', fontSize: 18 }} />
    },
    { 
      title: 'LADO BLANCO (DERECHO)', 
      className: 'column-group-border',
      children: [
        { title: 'T', dataIndex: 'turno_b', width: 40, align: 'center', render: t => <Text type="secondary">{t || '-'}</Text> },
        { title: 'P', dataIndex: 'clase_b', width: 40, align: 'center', render: c => c ? <Tag color="gold" style={{ margin: 0 }}>{c}</Tag> : '-' },
        { title: 'Traba', dataIndex: 'traba_b' },
        { title: 'Marca', dataIndex: 'marca_b', align: 'center', render: m => m || '-' },
        { title: 'Peso', render: (_, r) => <Text style={{ color: '#10b981', fontWeight: 600 }}>{r.peso_libras_b}-{r.peso_onzas_b}.{r.peso_puntos_b}</Text> },
        { title: 'Color', dataIndex: 'color_b' },
      ]
    },
    {
      title: 'Acción',
      render: (_, r) => (
        <Button 
          danger 
          type="text" 
          icon={<DeleteOutlined />} 
          disabled={isLocked} 
          onClick={() => deleteFight(r.id)}
        />
      )
    }
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div className="desktop-only" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ 
              width: 60, height: 60, 
              borderRadius: '50%', 
              background: 'rgba(16,185,129,0.1)', 
              border: '2px solid rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 0 15px rgba(16,185,129,0.2)'
          }}>
             <img src="/logo_coliseo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <Title level={2} style={{ color: '#fff', margin: 0, letterSpacing: '1px' }}>COLISEO ANGEL CRUZ</Title>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>CARRERA DE PALMAS, LA VEGA • CONTROL DE PESAJE</Text>
          </div>
        </div>
        <Space>
          <Button 
            icon={isLocked ? <UnlockOutlined /> : <LockOutlined />} 
            danger={!isLocked}
            onClick={toggleLock}
          >
            {isLocked ? 'Abrir Edición' : 'Cerrar Cartelera'}
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={exportPDF}>Exportar PDF</Button>
        </Space>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        className="premium-tabs"
        items={[
          {
            key: 'cartelera',
            label: <span><FilePdfOutlined /> CARTELERA ACTUAL</span>,
            children: (
              <Card className="glass-panel" styles={{ body: { padding: 0 } }}>
                <Table 
                  columns={columns} 
                  dataSource={fights} 
                  loading={loading}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            )
          },
          {
            key: 'pool',
            label: <span><ThunderboltFilled /> DEPÓSITO DE GALLOS ({roosters.length})</span>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {/* Formulario arriba horizontal */}
                <Card 
                  title={<Title level={5} style={{ color: '#fff', margin: 0, fontSize: 13, letterSpacing: '1px' }}>REGISTRO DE NUEVO GALLO</Title>}
                  className="glass-panel"
                  style={{ border: '1px solid rgba(16,185,129,0.1)' }}
                  styles={{ body: { padding: '24px 32px' } }}
                >
                  <Form form={roosterForm} layout="vertical" onFinish={addRoosterToPool}>
                    <Row gutter={24}>
                      <Col span={4}>
                        <Form.Item name="turno" label="TURNO" initialValue={nextTurn}>
                          <InputNumber min={1} className="premium-input-xl" style={{ width: '100%' }} disabled />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="clase" label="P (PELEADO)" initialValue="">
                          <Select className="premium-select-xl">
                            <Option value="">-</Option>
                            <Option value="P">P</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="traba" label="TRABA / DUEÑO" rules={[{ required: true }]}>
                          <Input placeholder="Ej. El Mayoral" className="premium-input-xl" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="marca" label="MARCA">
                          <InputNumber style={{ width: '100%' }} className="premium-input-xl" placeholder="000" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item name="color" label="COLOR">
                          <Select className="premium-select-xl" placeholder="Indio...">
                            {colors.map(c => <Option key={c} value={c}>{c}</Option>)}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Row gutter={24} align="bottom">
                      <Col span={8}>
                         <div style={{ background: 'rgba(5,5,5,0.4)', padding: '12px 24px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)' }}>
                           <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, display: 'block', marginBottom: 8, fontWeight: 700 }}>PESAJE (LBS,OZ.PTS)</Text>
                           <Form.Item 
                             name="peso_input" 
                             style={{ marginBottom: 0 }}
                             rules={[
                               { required: true, message: 'Requerido' },
                               { 
                                 pattern: /^[0-9]+,[0-9]+\.[0-9]$/, 
                                 message: 'Usa formato Libras,Onzas.Puntos (ej: 3,10.3)' 
                               }
                             ]}
                           >
                              <Input placeholder="3,10.3" className="premium-input-xl" style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }} />
                           </Form.Item>
                         </div>
                      </Col>
                      <Col span={16}>
                          <Space style={{ width: '100%' }}>
                            <Button 
                              type="primary" 
                              icon={editingRoosterId ? <SaveOutlined /> : <PlusOutlined />} 
                              htmlType="submit" 
                              loading={loading} 
                              style={{ height: 75, width: editingRoosterId ? 'auto' : '100%', fontSize: 16, fontWeight: 900, letterSpacing: '2px', background: editingRoosterId ? '#faad14' : '#10b981' }}
                            >
                              {editingRoosterId ? 'GUARDAR GALLO' : 'REGISTRAR GALLO EN DEPÓSITO'}
                            </Button>
                            {editingRoosterId && (
                              <Button 
                                type="default" 
                                icon={<CloseOutlined />} 
                                onClick={cancelEdit}
                                style={{ height: 75, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}
                              >
                                CANCELAR
                              </Button>
                            )}
                          </Space>
                      </Col>
                    </Row>
                  </Form>
                </Card>

                {/* Tabla abajo */}
                <div style={{ background: 'rgba(5,5,5,0.2)', padding: 24, borderRadius: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <Title level={5} style={{ color: '#fff', margin: 0 }}>Gallos en Espera ({roosters.length})</Title>
                      <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>EL SISTEMA BUSCARÁ PAREJAS CON HASTA 3 OZ DE DIFERENCIA</Text>
                    </div>
                    <Button 
                      type="primary" 
                      icon={<ThunderboltFilled />} 
                      style={{ background: '#10b981', height: 48, padding: '0 32px', fontWeight: 900, letterSpacing: '2px', border: 'none', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}
                      onClick={autoMatch}
                      loading={loading}
                    >
                      BOTÓN VS (AUTOMÁTICO)
                    </Button>
                  </div>
                  
                  <Table 
                    size="middle"
                    dataSource={roosters}
                    pagination={false}
                    className="premium-table-pool"
                    columns={[
                      { title: 'Turno', dataIndex: 'turno', width: 80, align: 'center' },
                      { title: 'Traba / Socio', dataIndex: 'traba', className: 'column-traba' },
                      { title: 'P', dataIndex: 'clase', width: 80, align: 'center', render: c => c ? <Tag color="gold">{c}</Tag> : '-' },
                      { title: 'Marca', dataIndex: 'marca', align: 'center' },
                      { title: 'Peso (Lb,Oz.Pt)', align: 'center', render: (_, r) => <Text style={{ color: '#10b981', fontWeight: 700 }}>{r.peso_libras},{r.peso_onzas}.{r.peso_puntos}</Text> },
                      { title: 'Color', dataIndex: 'color' },
                      { 
                        title: 'Acción', 
                        align: 'right',
                        render: (_, r) => (
                          <Space>
                            <Button 
                              type="text" 
                              icon={<EditOutlined style={{ color: '#1890ff', fontSize: 16 }} />} 
                              onClick={() => handleEditClick(r)}
                              title="Editar Gallo"
                            />
                            <Button 
                              type="text" 
                              danger 
                              icon={<DeleteOutlined style={{ fontSize: 16 }} />} 
                              onClick={() => deleteRooster(r.id)}
                              title="Eliminar Gallo"
                            />
                          </Space>
                        )
                      }
                    ]}
                  />
                </div>
              </div>
            )
          }
        ]}
      />

      <Modal 
        title={
          <div style={{ padding: '10px 0' }}>
            <Title level={4} style={{ color: '#fff', margin: 0, letterSpacing: '1px' }}>REGISTRO DE ENFRENTAMIENTO</Title>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>COLISEO ANGEL CRUZ - CONTROL DE PESAJE</Text>
          </div>
        }
        open={isModalOpen} 
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        width={1100}
        forceRender
        confirmLoading={loading}
        okText="REGISTRAR PELEA"
        closeIcon={<Title level={5} style={{ color: 'rgba(255,255,255,0.3)', margin: 0 }}>✕</Title>}
        styles={{ 
            content: { background: '#0a0a0a', border: '1px solid rgba(16,185,129,0.2)', padding: 0, borderRadius: 16, overflow: 'hidden' },
            header: { background: 'rgba(16,185,129,0.05)', padding: '20px 32px', margin: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' },
            body: { padding: '32px' },
            footer: { padding: '20px 32px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(5,5,5,0.4)' }
        }}
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleSave}
          onValuesChange={handleValuesChange}
          initialValues={{ 
            fecha_evento: new Date().toISOString().split('T')[0],
            peso_libras_a: 0, peso_onzas_a: 0, peso_puntos_a: 0,
            peso_libras_b: 0, peso_onzas_b: 0, peso_puntos_b: 0
          }}
        >
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px 24px', borderRadius: 12, marginBottom: 32, border: '1px solid rgba(255,255,255,0.05)' }}>
            <Row gutter={24} align="middle">
              <Col span={8}>
                <Form.Item name="posta" label={<span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>MONTO DE LA POSTA</span>} style={{ marginBottom: 0 }}>
                  <InputNumber prefix={<Text style={{ color: '#10b981' }}>$</Text>} style={{ width: '100%', height: 45, background: '#050505', border: '1px solid rgba(16,185,129,0.3)', color: '#fff', fontSize: 16 }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="fecha_evento" label={<span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>FECHA DEL EVENTO</span>} style={{ marginBottom: 0 }}>
                  <Input type="date" style={{ height: 45, background: '#050505', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                 <div style={{ textAlign: 'right' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, display: 'block' }}>ESTADO DE PESAJE</Text>
                    {weightDiff <= 3 ? (
                        <Tag color="success" style={{ margin: 0, borderRadius: 20 }}>DIFERENCIA OK ({weightDiff.toFixed(1)} oz)</Tag>
                    ) : (
                        <Tag color="error" style={{ margin: 0, borderRadius: 20 }}>FUERA DE RANGO ({weightDiff.toFixed(1)} oz)</Tag>
                    )}
                 </div>
              </Col>
            </Row>
          </div>

          <Row gutter={48} align="stretch" style={{ position: 'relative' }}>
            {/* LADO A */}
            <Col span={11}>
              <div style={{ 
                  background: 'rgba(16,185,129,0.03)', 
                  padding: 24, 
                  borderRadius: 16, 
                  border: '1px solid rgba(16,185,129,0.15)',
                  height: '100%'
              }}>
                <div style={{ borderBottom: '1px solid rgba(16,185,129,0.1)', marginBottom: 20, paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                   <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                   <Title level={5} style={{ color: '#fff', margin: 0, textTransform: 'uppercase', fontSize: 13 }}>COMPETIDOR AZUL</Title>
                </div>

                <Form.Item name="traba_a" label="NOMBRE DE TRABA (SOCIOS)" rules={[{ required: true }]}>
                  <Input placeholder="Ej. El Mayoral" className="premium-input-dark" />
                </Form.Item>

                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="peso_libras_a" label="LBS">
                      <InputNumber min={0} className="premium-input-dark" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="peso_onzas_a" label="OZ">
                      <InputNumber min={0} max={15} className="premium-input-dark" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="peso_puntos_a" label="PTS">
                      <InputNumber min={0} max={9} className="premium-input-dark" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="color_a" label="COLOR DE PLUMAJE">
                  <Select className="premium-select-dark">
                    {colors.map(c => <Option key={c} value={c}>{c}</Option>)}
                  </Select>
                </Form.Item>
              </div>
            </Col>

            {/* SEPARADOR VS */}
            <Col span={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
               <div style={{ 
                   width: 50, height: 50, 
                   borderRadius: '50%', 
                   border: '2px solid rgba(255,255,255,0.05)', 
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   background: '#0a0a0a',
                   zIndex: 2,
                   boxShadow: '0 0 20px rgba(16,185,129,0.1)'
               }}>
                  <Title level={4} style={{ margin: 0, color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>VS</Title>
               </div>
               <div style={{ position: 'absolute', top: 0, bottom: 0, width: 1, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.05), transparent)' }} />
            </Col>

            {/* LADO B */}
            <Col span={11}>
              <div style={{ 
                  background: 'rgba(212,175,55,0.03)', 
                  padding: 24, 
                  borderRadius: 16, 
                  border: '1px solid rgba(212,175,55,0.15)',
                  height: '100%'
              }}>
                <div style={{ borderBottom: '1px solid rgba(212,175,55,0.1)', marginBottom: 20, paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                   <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4af37' }} />
                   <Title level={5} style={{ color: '#fff', margin: 0, textTransform: 'uppercase', fontSize: 13 }}>COMPETIDOR BLANCO</Title>
                </div>

                <Form.Item name="traba_b" label="NOMBRE DE TRABA (SOCIOS)" rules={[{ required: true }]}>
                  <Input placeholder="Ej. Los Primos" className="premium-input-dark" />
                </Form.Item>

                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="peso_libras_b" label="LBS">
                      <InputNumber min={0} className="premium-input-dark" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="peso_onzas_b" label="OZ">
                      <InputNumber min={0} max={15} className="premium-input-dark" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="peso_puntos_b" label="PTS">
                      <InputNumber min={0} max={9} className="premium-input-dark" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="color_b" label="COLOR DE PLUMAJE">
                  <Select className="premium-select-dark">
                    {colors.map(c => <Option key={c} value={c}>{c}</Option>)}
                  </Select>
                </Form.Item>
              </div>
            </Col>
          </Row>

          {weightDiff > 3 && (
             <Alert 
               message={<span style={{ fontWeight: 800 }}>DIFERENCIA DE PESO CRÍTICA</span>}
               description={`La diferencia es de ${weightDiff.toFixed(1)} onzas. No se recomienda pactar peleas con más de 3.0 oz de desventaja.`}
               type="warning"
               showIcon
               style={{ marginTop: 32, borderRadius: 12, background: 'rgba(250, 173, 20, 0.05)', border: '1px solid rgba(250, 173, 20, 0.2)' }}
             />
          )}
        </Form>
      </Modal>

      <Modal 
        title={<Title level={4} style={{ color: '#fff', margin: 0 }}>REVISIÓN DE CRUCES GENERADOS</Title>}
        open={isPreviewModalOpen} 
        onCancel={() => setIsPreviewModalOpen(false)}
        onOk={confirmMatches}
        width={700}
        okText={`CONFIRMAR ${proposedFights.length} PELEAS`}
        okButtonProps={{ disabled: proposedFights.length === 0 }}
        confirmLoading={loading}
        styles={{ 
            content: { background: '#0a0a0a', border: '1px solid #10b981', borderRadius: 16 },
            header: { background: 'rgba(16,185,129,0.05)', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
            body: { padding: '20px 24px' }
        }}
      >
        <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
          
          {proposedFights.length > 0 && (
            <div style={{ marginBottom: 24 }}>
               <Title level={5} style={{ color: '#10b981', margin: '0 0 12px 0', borderBottom: '1px solid rgba(16,185,129,0.2)', paddingBottom: 8, fontSize: 12, letterSpacing: '1px' }}>
                 CRUCES LISTOS PARA CONFIRMAR ({proposedFights.length})
               </Title>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 {proposedFights.map((m, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                       <div style={{ flex: 1, textAlign: 'right' }}>
                          <Text style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{m.sideA.traba}</Text>
                          <br/><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{m.sideA.total_oz} oz</Text>
                       </div>
                       <div style={{ padding: '0 20px', textAlign: 'center' }}>
                          <Tag color="green" style={{ borderRadius: 20 }}>VS</Tag>
                          <br/><Text style={{ color: '#10b981', fontSize: 10 }}>Diff: {m.diff.toFixed(1)} oz</Text>
                       </div>
                       <div style={{ flex: 1, textAlign: 'left' }}>
                          <Text style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{m.sideB.traba}</Text>
                          <br/><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{m.sideB.total_oz} oz</Text>
                       </div>
                    </div>
                 ))}
               </div>
            </div>
          )}

          {unmatchedRoosters.length > 0 && (
            <div>
               <Title level={5} style={{ color: '#faad14', margin: '0 0 12px 0', borderBottom: '1px solid rgba(250,173,20,0.2)', paddingBottom: 8, fontSize: 12, letterSpacing: '1px' }}>
                 GALLOS SIN CRUCE ({unmatchedRoosters.length})
               </Title>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                 {unmatchedRoosters.map((r, idx) => (
                    <div key={`u-${idx}`} style={{ background: 'rgba(250,173,20,0.05)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(250,173,20,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                       <div>
                          <Text style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{r.traba}</Text>
                          <Tag color="default" style={{ marginLeft: 12, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.5)' }}>Turno: {r.turno || '-'}</Tag>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                          <Text style={{ color: '#faad14', fontWeight: 800, fontSize: 14 }}>{r.peso_libras},{r.peso_onzas}.{r.peso_puntos}</Text>
                          <br/><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Total: {r.total_oz} oz</Text>
                       </div>
                    </div>
                 ))}
               </div>
            </div>
          )}
          
        </div>
      </Modal>


      <style>{`
        .ant-table-thead > tr > th { background: rgba(255,255,255,0.02) !important; color: #fff !important; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.05) !important; }
        .ant-table-tbody > tr > td { background: transparent !important; color: rgba(255,255,255,0.8) !important; border-bottom: 1px solid rgba(255,255,255,0.02) !important; font-size: 11px; }
        .ant-table-row:hover > td { background: rgba(255,255,255,0.02) !important; }
        
        .premium-input-dark { background: #050505 !important; border: 1px solid rgba(255,255,255,0.08) !important; color: #fff !important; height: 40px !important; border-radius: 8px !important; text-align: center !important; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .premium-input-dark input { text-align: center !important; height: 100% !important; display: flex; align-items: center; justify-content: center; }
        .premium-input-dark:focus { border-color: #10b981 !important; box-shadow: 0 0 10px rgba(16,185,129,0.1) !important; }
        
        .premium-select-dark .ant-select-selector { background: #050505 !important; border: 1px solid rgba(255,255,255,0.08) !important; color: #fff !important; height: 40px !important; border-radius: 8px !important; display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; }
        .premium-select-dark .ant-select-selection-item { text-align: center !important; width: 100%; display: flex !important; align-items: center !important; justify-content: center !important; }
        
        .ant-modal-content { box-shadow: 0 20px 80px rgba(0,0,0,0.8) !important; }
        .ant-form-item-label > label { color: rgba(255,255,255,0.4) !important; font-size: 9px !important; font-weight: 800 !important; letter-spacing: 0.5px; }
        
        .ant-btn-primary { background: #10b981 !important; border: none !important; height: 45px !important; font-weight: 800 !important; letter-spacing: 1px !important; border-radius: 8px !important; }
        .ant-btn-default { background: rgba(255,255,255,0.05) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: #fff !important; height: 45px !important; border-radius: 8px !important; }
        
        .premium-input-xl { background: #050505 !important; border: 1px solid rgba(255,255,255,0.08) !important; color: #fff !important; height: 50px !important; border-radius: 12px !important; font-size: 16px !important; text-align: center !important; display: flex !important; align-items: center !important; justify-content: center !important; overflow: hidden; }
        .premium-input-xl input { text-align: center !important; height: 100% !important; display: flex !important; align-items: center !important; justify-content: center !important; line-height: 50px !important; }
        .premium-select-xl .ant-select-selector { background: #050505 !important; border: 1px solid rgba(255,255,255,0.08) !important; color: #fff !important; height: 50px !important; border-radius: 12px !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 14px; text-align: center !important; }
        .premium-select-xl .ant-select-selection-item { text-align: center !important; width: 100%; display: flex !important; align-items: center !important; justify-content: center !important; }
        
        .premium-table-pool .ant-table-thead > tr > th { background: rgba(16,185,129,0.03) !important; padding: 16px !important; }
        .premium-table-pool .column-traba { color: #fff !important; font-weight: 700; }
        
        .ant-tabs-tab { color: rgba(255,255,255,0.4) !important; padding: 12px 24px !important; }
        .ant-tabs-tab-active .ant-tabs-tab-btn { color: #10b981 !important; font-weight: 800 !important; }
        .ant-tabs-ink-bar { background: #10b981 !important; }
      `}</style>
    </div>
  );
};

export default AdminCarteleraView;
