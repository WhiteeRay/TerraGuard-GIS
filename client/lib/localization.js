const demoLabels = new Map([
  ['Зелёный квартал · Астана', 'Green Quarter · Astana'],
  ['Экопарк · Северный берег', 'Ecopark · North Bank'],
  ['Астана, район Есиль', 'Astana, Yesil district'],
  ['Астана, район Нура', 'Astana, Nura district'],
  ['Участок A · Строительная площадка', 'Zone A · Construction Site'],
  ['Участок B · Временное хранение', 'Zone B · Temporary Storage'],
  ['Участок C · Озеленение', 'Zone C · Landscaping'],
  ['Участок D · Рекультивация', 'Zone D · Restoration'],
  ['Участок E · Резервная территория', 'Zone E · Reserve Land'],
  ['Северный склон', 'Northern Slope'],
  ['Прибрежная зона', 'Riverside Zone'],
  ['Синтетические данные', 'Synthetic manual observations'],
  ['Ручное измерение', 'Manual observation'],
  ['Поэтапное снятие плодородного слоя. Синтетическая запись.', 'Phased topsoil stripping. Synthetic demonstration record.'],
  ['Организовано временное хранение с защитным укрытием.', 'Temporary storage with a protective cover in place.'],
  ['Распределён плодородный слой, выполнено озеленение.', 'Topsoil redistributed and landscaping completed.'],
  ['Повторное использование грунта для рекультивации.', 'Stored topsoil reused for land restoration.'],
  ['Перемещение оставшегося грунта на площадку хранения.', 'Transport the remaining topsoil to temporary storage.'],
  ['Подготовка территории к восстановлению.', 'Prepare the site for land restoration.'],
  ['Синтетический проект жилого квартала для демонстрации сохранения плодородного слоя. Не представляет реальную стройку.', 'Synthetic residential site demonstrating topsoil preservation. Not a real construction project.'],
  ['Синтетический проект благоустройства. Все границы и измерения вымышлены.', 'Synthetic landscaping site. All boundaries and measurements are demonstration data.']
]);

export function displayText(value) {
  return demoLabels.get(value) ?? value ?? '';
}

export function preserveOriginal(value, original) {
  return value === displayText(original) ? original : value;
}
