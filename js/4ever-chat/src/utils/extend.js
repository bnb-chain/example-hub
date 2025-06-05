Date.prototype.format = function (format) {
  if (format == "date") {
    return this.toDateString().replace(/^\w+\s/, "");
  }
  if (!format) {
    return this.toString()
      .replace(/^\w+\s/, "")
      .replace(/\sGMT.*$/, "");
  }
  var o = {
    "y+": this.getFullYear(),
    "M+": this.getMonth() + 1,
    "d+": this.getDate(),
    "H+": this.getHours(),
    "m+": this.getMinutes(),
    "s+": this.getSeconds(),
    S: this.getMilliseconds(),
  };
  for (var k in o) {
    var reg = new RegExp("(" + k + ")");
    if (reg.test(format)) {
      var v = o[k] + "";
      if (v.length == 1 && RegExp.$1.length < 4 && RegExp.$1.length > 1)
        v = "0" + v;
      format = format.replace(reg, v);
    }
  }
  return format;
};

Date.prototype.getNextMonth = function (gap = 1) {
  const date = new Date(this.getFullYear(), this.getMonth() + gap);
  return date;
};
Date.prototype.getMonthEnd = function () {
  return new Date(this.getNextMonth() - 1e3);
};

Date.prototype.getNextDay = function (gap = 1) {
  const date = new Date(
    this.getFullYear(),
    this.getMonth(),
    this.getDate() + gap
  );
  return date;
};
Date.prototype.getToday = function () {
  return this.format("yy-MM-dd 00:00:00").toDate();
};
Date.prototype.getDayEnd = function () {
  return new Date(this.getToday() * 1 + 86400e3 - 1e3);
};
Date.prototype.toISO8String = function () {
  return this.format("y-m-d HH:mm:ss");
};

String.prototype.toDate = function () {
  const arr = this.split(/\D+/);
  if (arr.length < 2) return null;
  for (const idx in arr) {
    arr[idx] = arr[idx] * 1;
  }
  arr[1] = arr[1] * 1 - 1;
  return new Date(...arr);
};

String.prototype.toNiceTime = function (now, mode = 1) {
  const date = this.toString().toDate();
  return date.toNiceTime(now, mode);
};
Date.prototype.toNiceTime = function (now, mode = 11) {
  const date = this;
  const second = Math.ceil((now - date) / 1e3);
  // console.log(now, date, second)
  if ((mode == 1 || mode == 11) && second >= 0) {
    // if (second < 10) return 'just now'
    if (second < 60) return second + "s ago";
    if (second < 60 * 60) return Math.floor(second / 60) + "m ago";
    if (mode == 11) {
      if (second < 86400) return Math.floor(second / 3600) + "h ago";
      return Math.floor(second / 86400) + "d ago";
    }
  }
  let datePart = date.format("yy-MM-dd");
  const timePart = date.format("HH:mm");
  const today = now.format("y-m-d").toDate();
  if (date.getFullYear() == now.getFullYear()) datePart = date.format("MM-dd");
  if (mode == 2) {
    return datePart;
  }
  if (second < 0) {
    const nextDay = now.getNextDay();
    if (date >= nextDay && date <= nextDay.getDayEnd()) datePart = "tomorrow";
  } else if (date >= today) datePart = "today";
  else if (date >= today.getNextDay(-1)) datePart = "yesterday";
  return timePart + " " + datePart;
};

String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.substr(1);
};

String.prototype.cutStr = function (pre = 100, trail = 0) {
  if (this.length <= pre + 3 + trail) return this;
  let txt = this.substr(0, pre) + "...";
  if (trail) txt += this.substr(-trail);
  return txt;
};

String.prototype.encode = function () {
  return this.replaceAll(" ", "%20");
};

String.prototype.getCountName = function (len, subfix = "s") {
  let num = len;
  if (len > 1e3) num = (num / 1e3).toFixed(1) + "k";
  return num + " " + this + (len > 1 ? subfix : "");
};

if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (word, tar) {
    const reg = new RegExp(word, "mg");
    return this.replace(reg, tar);
  };
}

Array.sortArrayBy = function (arr, key, isDesc) {
  arr.sort((a, b) => {
    const va = a[key] || 0;
    const vb = b[key] || 0;
    return (isDesc ? -1 : 1) * (va - vb);
  });
  return arr;
};
