import math
from itertools import groupby


def error(row):
    return row["forecast_mw"] - row["actual_mw"]


def abs_error(row):
    return abs(error(row))


def paired(rows):
    return [r for r in rows if r.get("actual_mw") is not None]


def mae(rows):
    p = paired(rows)
    if not p:
        return None
    return sum(abs_error(r) for r in p) / len(p)


def rmse(rows):
    p = paired(rows)
    if not p:
        return None
    return math.sqrt(sum(error(r) ** 2 for r in p) / len(p))


def bias(rows):
    p = paired(rows)
    if not p:
        return None
    return sum(error(r) for r in p) / len(p)


def nmae(rows):
    p = paired(rows)
    if not p:
        return None
    mean_actual = sum(r["actual_mw"] for r in p) / len(p)
    if mean_actual == 0:
        return None
    return mae(rows) / mean_actual


def mape(rows, min_actual=100):
    p = [r for r in paired(rows) if r["actual_mw"] >= min_actual]
    if not p:
        return None
    return sum(abs_error(r) / r["actual_mw"] for r in p) / len(p)


def summarise(rows):
    p = paired(rows)
    return {
        "n": len(p),
        "total": len(rows),
        "mae": _round(mae(rows)),
        "rmse": _round(rmse(rows)),
        "bias": _round(bias(rows)),
        "nmae": _round(nmae(rows), 4),
        "mape": _round(mape(rows), 4),
    }


def by_day(rows):
    def day_key(r):
        return r["start_time"].strftime("%Y-%m-%d")

    sorted_rows = sorted(rows, key=day_key)
    result = []
    for day, group in groupby(sorted_rows, key=day_key):
        result.append({"date": day, **summarise(list(group))})
    return result


def largest_errors(rows, n=10):
    p = paired(rows)
    ranked = sorted(p, key=abs_error, reverse=True)
    return [
        {
            "start_time": r["start_time"],
            "forecast_mw": r["forecast_mw"],
            "actual_mw": r["actual_mw"],
            "error": error(r),
        }
        for r in ranked[:n]
    ]


def _round(val, digits=1):
    if val is None:
        return None
    return round(val, digits)
