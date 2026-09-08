const images = {
  meat: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=85',
  beef: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=85',
  vegetable: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=85',
  soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&q=85',
  dessert: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=500&q=85',
  sweet: 'https://images.unsplash.com/photo-1519671282429-b44660ead0a7?w=500&q=85',
}

export const customerDays = [
  { name: 'Thứ 2', date: '22/06', foods: ['Thịt kho tiêu', 'Bò xào củ hành', 'Rau cải xào', 'Canh chua', 'Trái cây'] },
  { name: 'Thứ 3', date: '23/06', foods: ['Thịt kho đậu hũ', 'Cá nục kho cà', 'Đậu que xào', 'Canh bí đỏ', 'Chè đậu xanh'] },
  { name: 'Thứ 4', date: '24/06', foods: ['Cá diêu hồng kho cay', 'Thịt kho tiêu', 'Rau cải xào', 'Canh cải', 'Trái cây'] },
  { name: 'Thứ 5', date: '25/06', foods: ['Cá basa kho thơm', 'Bò xào củ hành', 'Đậu que xào', 'Canh chua', 'Chè đậu xanh'] },
  { name: 'Thứ 6', date: '26/06', foods: ['Thịt kho đậu hũ', 'Cá nục kho cà', 'Rau cải xào', 'Canh bí đỏ', 'Trái cây'] },
  { name: 'Thứ 7', date: '27/06', foods: ['Cá diêu hồng kho cay', 'Thịt kho tiêu', 'Đậu que xào', 'Canh cải', 'Chè đậu xanh'] },
]

export const customerFoodTypes = [
  { label: 'Món mặn 1', className: 'main', image: images.meat },
  { label: 'Món mặn 2', className: 'main', image: images.beef },
  { label: 'Rau/xào', className: 'veg', image: images.vegetable },
  { label: 'Món canh', className: 'soup', image: images.soup },
  { label: 'Tráng miệng', className: 'dessert', image: images.dessert },
]